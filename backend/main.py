import os
import re
import json
import base64
import asyncio
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
import numpy as np
import cv2
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from evaluator import (
    evaluate_paper, 
    evaluate_multi_question_paper, 
    evaluate_supplementary_exam, 
    evaluate_auto_extracted_exam
)
from database import submissions_collection, users_collection
from config import upload_image_to_cloud
from auth import (
    hash_password, verify_password, create_access_token, 
    get_current_user, require_roles
)

app = FastAPI(title="SmartPaperChecker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=5)

def safe_upload_file(file_bytes: bytes, filename: str = "doc") -> str:
    """Cloudinary પર અપલોડ કરે છે; જો ઉપલબ્ધ ન હોય તો Image/PDF માટે સુરક્ષિત Data URI બનાવે છે."""
    try:
        url = upload_image_to_cloud(file_bytes)
        if url and isinstance(url, str) and url.strip().startswith("http"):
            return url.strip()
    except Exception as e:
        print(f"[Cloudinary Warning]: {e}")
    
    # જો PDF હોય:
    if file_bytes.startswith(b"%PDF"):
        b64 = base64.b64encode(file_bytes).decode('utf-8')
        return f"data:application/pdf;base64,{b64}"

    # જો ઈમેજ હોય તો કમ્પ્રેસ કરીને Base64:
    try:
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            h, w = img.shape[:2]
            if max(h, w) > 900:
                scale = 900 / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
            _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 75])
            b64 = base64.b64encode(buffer.tobytes()).decode('utf-8')
            return f"data:image/jpeg;base64,{b64}"
    except Exception as cv_err:
        print(f"[Compress Error]: {cv_err}")

    b64 = base64.b64encode(file_bytes).decode('utf-8')
    return f"data:image/jpeg;base64,{b64}"

class UpdateSubmissionPayload(BaseModel):
    submission_id: str
    obtained_marks: float
    teacher_feedback: str
    evaluation_status: str

class RegisterPayload(BaseModel):
    name: str
    email: str
    password: str
    role: str = "TEACHER"
    roll_no: Optional[str] = None

class LoginPayload(BaseModel):
    email: str
    password: str

@app.get("/")
def read_root():
    return {"status": "Online", "service": "SmartPaperChecker API"}

# --- Auth Endpoints ---
@app.post("/api/auth/register")
async def register(payload: RegisterPayload):
    if users_collection is None:
        return {"success": False, "detail": "Database error"}
    
    existing = await users_collection.find_one({"email": payload.email.lower().strip()})
    if existing:
        raise HTTPException(status_code=400, detail="આ ઈમેલ પહેલેથી રજીસ્ટર થયેલો છે.")

    new_user = {
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "password_hash": hash_password(payload.password),
        "role": payload.role.upper(),
        "roll_no": payload.roll_no,
        "created_at": datetime.utcnow()
    }
    inserted = await users_collection.insert_one(new_user)
    token = create_access_token({"sub": str(inserted.inserted_id), "role": new_user["role"]})
    return {
        "success": True,
        "token": token,
        "user": {
            "id": str(inserted.inserted_id),
            "name": new_user["name"],
            "email": new_user["email"],
            "role": new_user["role"],
            "roll_no": new_user["roll_no"]
        }
    }

@app.post("/api/auth/login")
async def login(payload: LoginPayload):
    if users_collection is None:
        return {"success": False, "detail": "Database error"}

    user = await users_collection.find_one({"email": payload.email.lower().strip()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="અમાન્ય ઈમેલ અથવા પાસવર્ડ.")

    token = create_access_token({"sub": str(user["_id"]), "role": user.get("role", "TEACHER")})
    return {
        "success": True,
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email"),
            "role": user.get("role"),
            "roll_no": user.get("roll_no")
        }
    }

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "user": {
            "id": current_user["_id"],
            "name": current_user.get("name"),
            "email": current_user.get("email"),
            "role": current_user.get("role"),
            "roll_no": current_user.get("roll_no")
        }
    }

# --- 1. Single Paper Evaluation ---
@app.post("/api/evaluate")
async def evaluate_single_paper(
    file: UploadFile = File(...),
    student_name: str = Form("Rahul Sharma"),
    roll_no: str = Form("101"),
    subject: str = Form("General"),
    question: str = Form(...),
    model_answer: str = Form(...),
    max_marks: float = Form(...)
):
    try:
        image_bytes = await file.read()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor, evaluate_paper, image_bytes, question, model_answer, max_marks
        )

        cloud_url = await loop.run_in_executor(executor, safe_upload_file, image_bytes, file.filename)
        result["image_url"] = cloud_url

        try:
            submission_doc = {
                "student_name": student_name,
                "roll_no": roll_no,
                "subject": subject,
                "question": question,
                "model_answer": model_answer,
                "max_marks": max_marks,
                "image_url": cloud_url,
                "obtained_marks": result.get("obtained_marks", 0.0),
                "evaluation_status": result.get("evaluation_status", "PENDING"),
                "extracted_text": result.get("extracted_text", ""),
                "missing_points": result.get("missing_points", []),
                "teacher_feedback": result.get("teacher_feedback", ""),
                "is_verified": False,
                "created_at": datetime.utcnow()
            }
            if submissions_collection is not None:
                inserted = await submissions_collection.insert_one(submission_doc)
                result["submission_id"] = str(inserted.inserted_id)
        except Exception as db_err:
            print(f"[DB Warning] સેવ સ્કીપ: {db_err}")

        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "detail": str(e)}

# --- 2. Multi-Question Exam Evaluation ---
@app.post("/api/evaluate-multi")
async def evaluate_multi_exam(
    file: UploadFile = File(...),
    student_name: str = Form("Rahul Sharma"),
    roll_no: str = Form("101"),
    subject: str = Form("Computer Science"),
    exam_title: str = Form("Unit Test 1"),
    questions_json: str = Form(...)
):
    try:
        image_bytes = await file.read()
        questions_list = json.loads(questions_json)

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor, evaluate_multi_question_paper, image_bytes, questions_list
        )

        cloud_url = await loop.run_in_executor(executor, safe_upload_file, image_bytes, file.filename)
        result["image_url"] = cloud_url

        try:
            if submissions_collection is not None:
                doc = {
                    "student_name": student_name,
                    "roll_no": roll_no,
                    "subject": subject,
                    "exam_title": exam_title,
                    "is_multi_question": True,
                    "questions_evaluation": result.get("questions_evaluation", []),
                    "obtained_marks": result.get("total_obtained_marks", 0.0),
                    "max_marks": result.get("total_max_marks", 0.0),
                    "evaluation_status": result.get("overall_status", "PARTIAL"),
                    "teacher_feedback": result.get("overall_feedback", ""),
                    "image_url": cloud_url,
                    "extracted_text": result.get("extracted_overall_text", ""),
                    "is_verified": False,
                    "created_at": datetime.utcnow()
                }
                inserted = await submissions_collection.insert_one(doc)
                result["submission_id"] = str(inserted.inserted_id)
        except Exception as db_err:
            print(f"[DB Warning] Multi Exam સેવ સ્કીપ: {db_err}")

        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "detail": str(e)}

# --- 3. Supplementary Form Mode ---
@app.post("/api/evaluate-supplementary")
async def evaluate_supplementary(
    files: List[UploadFile] = File(...),
    student_name: str = Form("Student"),
    roll_no: str = Form("101"),
    subject: str = Form("General"),
    exam_payload_json: str = Form(...)
):
    try:
        images_bytes = []
        for file in files:
            b = await file.read()
            images_bytes.append(b)

        loop = asyncio.get_event_loop()
        upload_tasks = [
            loop.run_in_executor(executor, safe_upload_file, img_b, "page.jpg")
            for img_b in images_bytes
        ]
        cloud_urls = await asyncio.gather(*upload_tasks)

        exam_payload = json.loads(exam_payload_json)
        result = await loop.run_in_executor(
            executor, evaluate_supplementary_exam, images_bytes, exam_payload
        )

        result["pages_urls"] = cloud_urls

        try:
            if submissions_collection is not None:
                doc = {
                    "student_name": student_name,
                    "roll_no": roll_no,
                    "subject": subject,
                    "exam_title": exam_payload.get("exam_title", "Semester Exam"),
                    "is_supplementary": True,
                    "pages_count": len(files),
                    "pages_urls": cloud_urls,
                    "sections_evaluation": result.get("sections_evaluation", []),
                    "obtained_marks": result.get("total_obtained_marks", 0.0),
                    "max_marks": result.get("total_max_marks", 0.0),
                    "evaluation_status": result.get("overall_status", "CORRECT"),
                    "teacher_feedback": result.get("overall_summary", ""),
                    "is_verified": False,
                    "created_at": datetime.utcnow()
                }
                inserted = await submissions_collection.insert_one(doc)
                result["submission_id"] = str(inserted.inserted_id)
        except Exception as db_err:
            print(f"[DB Warning] Supplementary સેવ સ્કીપ: {db_err}")

        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "detail": str(e)}

# --- 4. Zero-Typing Auto Upload Mode (Supports Image & PDF) ---
@app.post("/api/evaluate-auto-upload")
async def evaluate_auto_upload(
    question_paper_files: List[UploadFile] = File(...),
    answer_key_files: List[UploadFile] = File(...),
    student_files: List[UploadFile] = File(...),
    student_name: str = Form("Student"),
    roll_no: str = Form("101"),
    subject: str = Form("General"),
    exam_title: str = Form("Exam")
):
    try:
        loop = asyncio.get_event_loop()

        qp_bytes = [await f.read() for f in question_paper_files]
        ak_bytes = [await f.read() for f in answer_key_files]
        st_bytes = [await f.read() for f in student_files]

        upload_tasks = [
            loop.run_in_executor(executor, safe_upload_file, b, "student_doc")
            for b in st_bytes
        ]
        cloud_urls = await asyncio.gather(*upload_tasks)

        result = await loop.run_in_executor(
            executor,
            evaluate_auto_extracted_exam,
            qp_bytes,
            ak_bytes,
            st_bytes,
            exam_title,
            subject
        )

        result["pages_urls"] = cloud_urls

        if submissions_collection is not None:
            doc = {
                "student_name": student_name,
                "roll_no": roll_no,
                "subject": subject,
                "exam_title": exam_title,
                "is_supplementary": True,
                "pages_count": len(student_files),
                "pages_urls": cloud_urls,
                "sections_evaluation": result.get("sections_evaluation", []),
                "obtained_marks": result.get("total_obtained_marks", 0.0),
                "max_marks": result.get("total_max_marks", 0.0),
                "evaluation_status": result.get("overall_status", "CORRECT"),
                "teacher_feedback": result.get("overall_summary", ""),
                "is_verified": False,
                "created_at": datetime.utcnow()
            }
            inserted = await submissions_collection.insert_one(doc)
            result["submission_id"] = str(inserted.inserted_id)

        return {"success": True, "data": result}
    except Exception as e:
        print(f"[Auto Upload Error]: {e}")
        return {"success": False, "detail": str(e)}

# --- 5. Bulk Multi-Page / PDF Batch Mode ---
def _process_student_multipage_batch(
    roll_key: str, 
    student_name: str,
    student_pages_bytes: list[bytes], 
    qp_bytes_list: list, 
    ak_bytes_list: list, 
    exam_title: str, 
    subject: str
):
    try:
        eval_result = evaluate_auto_extracted_exam(
            question_paper_bytes_list=qp_bytes_list,
            answer_key_bytes_list=ak_bytes_list,
            student_supplementary_bytes_list=student_pages_bytes,
            exam_title=exam_title,
            subject=subject
        )
        page_urls = [safe_upload_file(b, f"{roll_key}_page") for b in student_pages_bytes]
        return {
            "student_name": student_name,
            "roll_no": roll_key,
            "pages_count": len(student_pages_bytes),
            "obtained_marks": eval_result.get("total_obtained_marks", 0.0),
            "max_marks": eval_result.get("total_max_marks", 0.0),
            "evaluation_status": eval_result.get("overall_status", "CORRECT"),
            "teacher_feedback": eval_result.get("overall_summary", ""),
            "pages_urls": page_urls,
            "status": "Success"
        }
    except Exception as e:
        return {
            "student_name": student_name,
            "roll_no": roll_key,
            "pages_count": len(student_pages_bytes),
            "obtained_marks": 0.0,
            "max_marks": 0.0,
            "evaluation_status": "ERROR",
            "teacher_feedback": f"ભૂલ: {str(e)}",
            "pages_urls": [],
            "status": "Failed"
        }

@app.post("/api/evaluate-batch-auto")
async def evaluate_batch_auto(
    question_paper_files: List[UploadFile] = File(...),
    answer_key_files: List[UploadFile] = File(...),
    student_files: List[UploadFile] = File(...),
    exam_title: str = Form("Class Exam"),
    subject: str = Form("General")
):
    try:
        loop = asyncio.get_event_loop()
        qp_bytes = [await f.read() for f in question_paper_files]
        ak_bytes = [await f.read() for f in answer_key_files]

        # વિદ્યાર્થીવાર પાના ગ્રૂપિંગ (PDF અથવા Images)
        # ઉદાહરણ ફાઇલનામો: '101_Rahul.pdf', '101_p1.jpg', '101_p2.jpg'
        grouped_students = defaultdict(list)
        student_names_map = {}

        for idx, f in enumerate(student_files):
            b = await f.read()
            filename_clean = os.path.splitext(f.filename)[0]
            match = re.search(r"(\d+)", filename_clean)
            roll_key = match.group(1) if match else f"Std_{idx + 1}"
            
            # નામમાંથી રોલ નંબર હટાવી સ્વચ્છ નામ મેળવવું
            clean_name = re.sub(r"^\d+[\s_-]*", "", filename_clean).replace("_", " ").strip()
            if not clean_name:
                clean_name = f"Student {roll_key}"

            grouped_students[roll_key].append(b)
            student_names_map[roll_key] = clean_name

        tasks = [
            loop.run_in_executor(
                executor,
                _process_student_multipage_batch,
                roll_key,
                student_names_map[roll_key],
                pages_bytes,
                qp_bytes,
                ak_bytes,
                exam_title,
                subject
            )
            for roll_key, pages_bytes in grouped_students.items()
        ]

        results = await asyncio.gather(*tasks)

        if submissions_collection is not None:
            docs_to_insert = [
                {
                    "student_name": r["student_name"],
                    "roll_no": r["roll_no"],
                    "subject": subject,
                    "exam_title": exam_title,
                    "is_supplementary": True,
                    "pages_count": r["pages_count"],
                    "pages_urls": r["pages_urls"],
                    "obtained_marks": r["obtained_marks"],
                    "max_marks": r["max_marks"],
                    "evaluation_status": r["evaluation_status"],
                    "teacher_feedback": r["teacher_feedback"],
                    "is_verified": False,
                    "created_at": datetime.utcnow()
                }
                for r in results if r["status"] == "Success"
            ]
            if docs_to_insert:
                await submissions_collection.insert_many(docs_to_insert)

        return {"success": True, "data": results}
    except Exception as e:
        return {"success": False, "detail": str(e)}

# --- Submissions & Analytics Endpoints ---
@app.put("/api/submissions/verify")
async def verify_submission(payload: UpdateSubmissionPayload):
    try:
        if submissions_collection is None:
            return {"success": True, "message": "Database not connected"}
        
        await submissions_collection.update_one(
            {"_id": ObjectId(payload.submission_id)},
            {"$set": {
                "obtained_marks": payload.obtained_marks,
                "teacher_feedback": payload.teacher_feedback,
                "evaluation_status": payload.evaluation_status,
                "is_verified": True,
                "verified_at": datetime.utcnow()
            }}
        )
        return {"success": True, "message": "Submission verified successfully"}
    except Exception as e:
        return {"success": False, "detail": str(e)}

@app.get("/api/submissions")
async def get_all_submissions(limit: int = 50):
    try:
        if submissions_collection is None:
            return {"success": True, "data": []}
        cursor = submissions_collection.find().sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        for doc in docs:
            doc["_id"] = str(doc["_id"])
            if "created_at" in doc and isinstance(doc["created_at"], datetime):
                doc["created_at"] = doc["created_at"].isoformat()
        return {"success": True, "data": docs}
    except Exception:
        return {"success": True, "data": []}

@app.get("/api/analytics")
async def get_analytics():
    empty_res = {
        "total_papers": 0, "average_marks": 0.0, "highest_marks": 0.0, "lowest_marks": 0.0,
        "breakdown": {"correct": 0, "partial": 0, "incorrect": 0}
    }
    try:
        if submissions_collection is None:
            return {"success": True, "data": empty_res}

        total_papers = await submissions_collection.count_documents({})
        if total_papers == 0:
            return {"success": True, "data": empty_res}

        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "avg_marks": {"$avg": "$obtained_marks"},
                    "max_obtained": {"$max": "$obtained_marks"},
                    "min_obtained": {"$min": "$obtained_marks"}
                }
            }
        ]
        stats = await submissions_collection.aggregate(pipeline).to_list(1)
        stat_data = stats[0] if stats else {"avg_marks": 0, "max_obtained": 0, "min_obtained": 0}

        correct_count = await submissions_collection.count_documents({"evaluation_status": "CORRECT"})
        partial_count = await submissions_collection.count_documents({"evaluation_status": "PARTIAL"})
        incorrect_count = await submissions_collection.count_documents({"evaluation_status": "INCORRECT"})

        return {
            "success": True,
            "data": {
                "total_papers": total_papers,
                "average_marks": round(stat_data.get("avg_marks") or 0.0, 2),
                "highest_marks": stat_data.get("max_obtained", 0.0),
                "lowest_marks": stat_data.get("min_obtained", 0.0),
                "breakdown": {
                    "correct": correct_count,
                    "partial": partial_count,
                    "incorrect": incorrect_count
                }
            }
        }
    except Exception:
        return {"success": True, "data": empty_res}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)