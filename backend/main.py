from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from evaluator import evaluate_paper

app = FastAPI(title="IndicGrade AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "IndicGrade AI Engine is Running"}

@app.post("/api/evaluate")
async def evaluate_submission(
    file: UploadFile = File(...),
    question: str = Form(...),
    model_answer: str = Form(...),
    max_marks: float = Form(...)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="કૃપા કરીને માત્ર ઇમેજ ફાઇલ અપલોડ કરો.")
        
    image_bytes = await file.read()
    
    try:
        evaluation = evaluate_paper(
            image_bytes=image_bytes,
            question=question,
            model_answer=model_answer,
            max_marks=max_marks
        )
        return {"success": True, "data": evaluation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)