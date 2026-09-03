from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SubmissionRecord(BaseModel):
    student_name: str
    roll_no: str
    subject: str
    question: str
    model_answer: str
    max_marks: float
    obtained_marks: float
    evaluation_status: str
    extracted_text: Optional[str] = ""
    missing_points: List[str] = []
    teacher_feedback: Optional[str] = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExamCreate(BaseModel):
    title: str
    subject: str
    standard_or_batch: str
    total_marks: float