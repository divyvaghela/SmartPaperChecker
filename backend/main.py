import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from evaluator import evaluate_paper
from database import submissions_collection

app = FastAPI(title="SmartPaperChecker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=5)

class UpdateSubmissionPayload(BaseModel):
    submission_id: str
    obtained_marks: float
    teacher_feedback: str
    evaluation_status: str

@app.get("/")
def read_root():
    return {"status": "Online", "service": "SmartPaperChecker API"}

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

        # MongoDB સેવિંગ વિથ ફોલબેક
        try:
            submission_doc = {
                "student_name": student_name,
                "roll_no": roll_no,
                "subject": subject,
                "question": question,
                "model_answer": model_answer,
                "max_marks": max_marks,
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
            print(f"[DB Warning] ડેટાબેઝ સેવ સ્કીપ થયું: {db_err}")

        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "detail": str(e)}

def _process_one_file(idx: int, filename: str, image_bytes: bytes, question: str, model_answer: str, max_marks: float, subject: str):
    student_id = f"Roll_{101 + idx}"
    try:
        eval_result = evaluate_paper(image_bytes, question, model_answer, max_marks)
        return {
            "student_id": student_id,
            "student_name": f"Student {101 + idx}",
            "filename": filename,
            "subject": subject,
            "status": "Success",
            **eval_result
        }
    except Exception as e:
        return {
            "student_id": student_id,
            "student_name": f"Student {101 + idx}",
            "filename": filename,
            "subject": subject,
            "status": "Failed",
            "error": str(e),
            "obtained_marks": 0.0,
            "max_marks": max_marks,
            "evaluation_status": "ERROR",
            "teacher_feedback": f"મૂલ્યાંકનમાં ક્ષતિ: {str(e)}"
        }

@app.post("/api/evaluate-batch")
async def evaluate_batch_papers(
    files: List[UploadFile] = File(...),
    subject: str = Form("General"),
    question: str = Form(...),
    model_answer: str = Form(...),
    max_marks: float = Form(...)
):
    loop = asyncio.get_event_loop()
    tasks = []

    for idx, file in enumerate(files):
        img_bytes = await file.read()
        task = loop.run_in_executor(
            executor,
            _process_one_file,
            idx,
            file.filename,
            img_bytes,
            question,
            model_answer,
            max_marks,
            subject
        )
        tasks.append(task)

    results = await asyncio.gather(*tasks)

    # MongoDB માં બેચ રેકોર્ડ્સ સ્ટોર કરવા
    try:
        if submissions_collection is not None:
            docs_to_insert = []
            for r in results:
                docs_to_insert.append({
                    "student_name": r.get("student_name", "Student"),
                    "roll_no": r.get("student_id", "Unknown"),
                    "subject": subject,
                    "question": question,
                    "model_answer": model_answer,
                    "max_marks": max_marks,
                    "obtained_marks": r.get("obtained_marks", 0.0),
                    "evaluation_status": r.get("evaluation_status", "ERROR"),
                    "extracted_text": r.get("extracted_text", ""),
                    "missing_points": r.get("missing_points", []),
                    "teacher_feedback": r.get("teacher_feedback", ""),
                    "is_verified": False,
                    "created_at": datetime.utcnow()
                })

            if docs_to_insert:
                await submissions_collection.insert_many(docs_to_insert)
    except Exception as db_err:
        print(f"[DB Warning] બેચ સેવિંગ સ્કીપ થયું: {db_err}")

    return {"success": True, "data": results}

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