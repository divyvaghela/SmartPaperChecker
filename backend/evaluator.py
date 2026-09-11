import os
import cv2
import json
import time
import numpy as np
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY સેટ થયેલ નથી.")

client = genai.Client(api_key=api_key)

def quick_compress_image(image_bytes: bytes) -> bytes:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return image_bytes
    
    h, w = img.shape[:2]
    max_dim = 1000
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        
    _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return buffer.tobytes()

def evaluate_paper(image_bytes: bytes, question: str, model_answer: str, max_marks: float) -> dict:
    compressed_img_bytes = quick_compress_image(image_bytes)

    prompt = f"""
    તમે એક કુશળ શિક્ષક અને પરીક્ષક છો. આપેલી ઇમેજમાં વિદ્યાર્થીએ હાથે લખેલો જવાબ (ગુજરાતી, અંગ્રેજી અથવા મિક્સ) છે.

    [પરીક્ષા વિગત]
    - પ્રશ્ન: {question}
    - સાચો આદર્શ જવાબ: {model_answer}
    - કુલ ગુણ: {max_marks}

    [કાર્ય]
    1. વિદ્યાર્થીનું હસ્તલેખન ધ્યાનથી વાંચીને extracted_text તરીકે કાઢો.
    2. શબ્દોની સાથે અર્થ અને કન્સેપ્ટ ચકાસીને સ્ટેપ-વાઇઝ માર્ક્સ આપો.
    3. ખૂટતા મુદ્દા અને શિક્ષક તરીકે રચનાત્મક ફીડબેક આપો.

    માત્ર શુદ્ધ JSON ફોર્મેટ આપો:
    {{
      "extracted_text": "વિદ્યાર્થીએ લખેલું લખાણ",
      "obtained_marks": 0.0,
      "max_marks": {max_marks},
      "evaluation_status": "CORRECT",
      "missing_points": ["મુદ્દો ૧"],
      "teacher_feedback": "જવાબ અંગે ટિપ્પણી"
    }}
    """

    models_pool = ["gemini-3.6-flash", "gemini-3.1-pro-preview"]    
    last_err = None
    for model_id in models_pool:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_id,
                    contents=[
                        types.Part.from_bytes(data=compressed_img_bytes, mime_type="image/jpeg"),
                        prompt
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                
                if response and response.text:
                    return json.loads(response.text.strip())

            except Exception as e:
                last_err = e
                err_str = str(e)
                print(f"[{model_id}] Single Eval Error: {err_str}")
                if "503" in err_str or "UNAVAILABLE" in err_str:
                    time.sleep(1.5)
                else:
                    break

    raise RuntimeError(f"સર્વર હાલ વ્યસ્ત છે: {last_err}")

def evaluate_multi_question_paper(image_bytes: bytes, questions_payload: list) -> dict:
    compressed_img_bytes = quick_compress_image(image_bytes)

    prompt = f"""
    તમે એક તટસ્થ અને અનુભવી પરીક્ષક છો. વિદ્યાર્થીની આપેલી ઉત્તરવહીની ઇમેજમાં એકથી વધુ પ્રશ્નોના જવાબો લખેલા છે.

    [પરીક્ષાના તમામ પ્રશ્નો અને મોડેલ આન્સર-કી]
    {json.dumps(questions_payload, ensure_ascii=False, indent=2)}

    [કાર્યવાહીની સૂચનાઓ]
    1. વિદ્યાર્થીની ઉત્તરવહીમાંથી દરેક પ્રશ્નનો ઉત્તર શોધો (Q1, Q2, ક્રમ કે હેડિંગ પ્રમાણે).
    2. દરેક પ્રશ્ન માટે સ્વતંત્ર ગુણ અને ફીડબેક આપો. જો કોઈ પ્રશ્ન ન લખ્યો હોય તો 0 ગુણ આપો.
    3. સમગ્ર પેપરના કુલ ગુણ ગણીને આપો.

    માત્ર શુદ્ધ JSON ફોર્મેટ આપો:
    {{
      "extracted_overall_text": "વિદ્યાર્થીની ઉત્તરવહીમાંથી વંચાયેલું સમગ્ર લખાણ",
      "questions_evaluation": [
        {{
          "q_no": 1,
          "question": "પ્રશ્નનું લખાણ",
          "max_marks": 5.0,
          "obtained_marks": 4.0,
          "status": "CORRECT",
          "student_answer_snippet": "વિદ્યાર્થીએ લખેલા ઉત્તરનો મુખ્ય અંશ",
          "feedback": "પ્રશ્નવાર ટૂંકી ટિપ્પણી",
          "missing_points": ["મુદ્દો ૧"]
        }}
      ],
      "total_max_marks": 10.0,
      "total_obtained_marks": 8.0,
      "overall_status": "CORRECT",
      "overall_feedback": "સમગ્ર ઉત્તરવહી વિશે શિક્ષકનો આખરી અભિપ્રાય"
    }}
    """

    models_pool = ["gemini-3.6-flash", "gemini-3.1-pro-preview"]
    last_err = None

    for model_id in models_pool:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_id,
                    contents=[
                        types.Part.from_bytes(data=compressed_img_bytes, mime_type="image/jpeg"),
                        prompt
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                if response and response.text:
                    return json.loads(response.text.strip())
            except Exception as e:
                last_err = e
                err_str = str(e)
                print(f"[{model_id}] Multi Eval Error: {err_str}")
                if "503" in err_str or "UNAVAILABLE" in err_str:
                    time.sleep(1.5)
                else:
                    break

    total_max = sum(float(q.get("max_marks", 0)) for q in questions_payload)
    return {
        "extracted_overall_text": f"મૂલ્યાંકન કરવામાં સમસ્યા આવી: {str(last_err)}",
        "questions_evaluation": [
            {
                "q_no": q.get("q_no", idx + 1),
                "question": q.get("question", ""),
                "max_marks": float(q.get("max_marks", 5)),
                "obtained_marks": 0.0,
                "status": "ERROR",
                "student_answer_snippet": "-",
                "feedback": f"API ક્ષતિ: {str(last_err)}",
                "missing_points": []
            } for idx, q in enumerate(questions_payload)
        ],
        "total_max_marks": total_max,
        "total_obtained_marks": 0.0,
        "overall_status": "INCORRECT",
        "overall_feedback": "કૃપા કરીને ફરીથી પ્રયાસ કરો."
    }

def evaluate_supplementary_exam(images_bytes_list: list[bytes], exam_payload: dict) -> dict:
    """
    મલ્ટી-પેજ સપ્લીમેન્ટરી અને આડાઅવળા લખેલા જવાબોનું મૂલ્યાંકન
    """
    compressed_parts = []
    for img_b in images_bytes_list:
        comp_b = quick_compress_image(img_b)
        compressed_parts.append(types.Part.from_bytes(data=comp_b, mime_type="image/jpeg"))

    prompt = f"""
તમે યુનિવર્સિટી કક્ષાના મુખ્ય પરીક્ષક (Head Academic Examiner) છો.
વિદ્યાર્થીએ એક કે તેથી વધુ પાનાની સપ્લીમેન્ટરી (ઉત્તરવહી) માં જવાબો લખેલા છે.

[મહત્વપૂર્ણ નિયમો]:
1. વિદ્યાર્થીએ જવાબો આડાઅવળા (દા.ત. પહેલાં Q3, પછી Q1, અથવા Section B પહેલાં) લખ્યા હોઈ શકે છે.
2. એક જ પ્રશ્નનો જવાબ બે પાના વચ્ચે ફેલાયેલો પણ હોઈ શકે છે.
3. તમામ પાનાનું ધ્યાનથી નિરીક્ષણ કરીને નક્કી કરો કે કયો જવાબ કયા પ્રશ્નનો છે.
4. પ્રશ્નપત્રમાં દર્શાવેલા દરેક પ્રશ્નનું સાચા મોડેલ આન્સર સાથે સ્વતંત્ર મૂલ્યાંકન કરો. જો ઉત્તરવહીમાં ક્યાંય જવાબ ન મળે તો જ 0 ગુણ આપવા.

[પ્રશ્નપત્ર, સેક્શન્સ અને આદર્શ આન્સર-કી]:
{json.dumps(exam_payload, ensure_ascii=False, indent=2)}

માત્ર શુદ્ધ JSON ફોર્મેટ આપો:
{{
  "overall_summary": "વિદ્યાર્થીના સમગ્ર પેપરનું આકલન",
  "total_max_marks": 0.0,
  "total_obtained_marks": 0.0,
  "overall_status": "CORRECT",
  "sections_evaluation": [
    {{
      "section_name": "Section A",
      "questions": [
        {{
          "q_id": "Q1",
          "question": "પ્રશ્નનું લખાણ",
          "found_in_supplementary": true,
          "page_reference": "Page 1",
          "student_answer_snippet": "વિદ્યાર્થીએ લખેલા લખાણનો સારાંશ",
          "max_marks": 2.0,
          "obtained_marks": 2.0,
          "status": "CORRECT",
          "feedback": "પ્રશ્નવાર ટૂંકી ટિપ્પણી",
          "missing_points": []
        }}
      ]
    }}
  ]
}}
"""

    models_pool = ["gemini-3.6-flash", "gemini-3.1-pro-preview"]
    last_err = None

    for model_id in models_pool:
        for attempt in range(2):
            try:
                contents = [prompt] + compressed_parts
                response = client.models.generate_content(
                    model=model_id,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                if response and response.text:
                    return json.loads(response.text.strip())
            except Exception as e:
                last_err = e
                print(f"[{model_id}] Supplementary Eval Error: {e}")
                if "503" in str(e) or "UNAVAILABLE" in str(e):
                    time.sleep(1.5)
                else:
                    break

    raise RuntimeError(f"સપ્લીમેન્ટરી મૂલ્યાંકનમાં ક્ષતિ આવી: {last_err}")

def evaluate_auto_extracted_exam(
    question_paper_bytes_list: list[bytes],
    answer_key_bytes_list: list[bytes],
    student_supplementary_bytes_list: list[bytes],
    exam_title: str = "Exam",
    subject: str = "General"
) -> dict:
    """
    પ્રશ્નપત્ર, આન્સર કી અને સપ્લીમેન્ટરી ત્રણેયના ફોટા સ્કેન કરીને સીધું મૂલ્યાંકન કરે છે.
    """
    contents = []

    prompt = f"""
તમે એક અનુભવી મુખ્ય પરીક્ષક છો. તમારી પાસે નીચે મુજબના દસ્તાવેજો છે:
1. [પ્રશ્નપત્ર - Question Paper]: પરીક્ષાના પ્રશ્નો, સેક્શન્સ અને દરેક પ્રશ્નના ગુણ.
2. [આદર્શ ઉત્તરવહી - Model Answer Key]: સાચા જવાબો અને મૂલ્યાંકનના માપદંડ.
3. [વિદ્યાર્થીની ઉત્તરવહી - Student Supplementary]: વિદ્યાર્થીએ હાથે લખેલા જવાબો (આડાઅવળા પણ હોઈ શકે).

[પરીક્ષા વિગત]:
- શીર્ષક: {exam_title}
- વિષય: {subject}

[તમારું કાર્ય]:
1. પ્રશ્નપત્રમાંથી તમામ પ્રશ્નો, સેક્શન અને તેમના મહત્તમ ગુણ (max_marks) ઓળખો.
2. આન્સર કીમાંથી સાચો સંદર્ભ સમજો.
3. વિદ્યાર્થીની ઉત્તરવહીમાંથી દરેક પ્રશ્નનો સાચો જવાબ શોધીને સ્ટેપ-વાઇઝ માર્ક્સ ફાળવો. જો કોઈ પ્રશ્ન ન લખ્યો હોય તો 0 ગુણ આપો.
4. સમગ્ર પેપરના મેળવેલા ગુણ અને રચનાત્મક શિક્ષક ટિપ્પણી આપો.

માત્ર શુદ્ધ JSON ફોર્મેટ આપો:
{{
  "overall_summary": "વિદ્યાર્થીના સમગ્ર પરિણામ વિશે ટિપ્પણી",
  "total_max_marks": 0.0,
  "total_obtained_marks": 0.0,
  "overall_status": "CORRECT",
  "sections_evaluation": [
    {{
      "section_name": "Section A",
      "questions": [
        {{
          "q_id": "Q1",
          "question": "પ્રશ્નપત્રમાંથી વંચાયેલો પ્રશ્ન",
          "max_marks": 2.0,
          "obtained_marks": 2.0,
          "page_reference": "Page 1",
          "student_answer_snippet": "વિદ્યાર્થીએ લખેલો જવાબ",
          "status": "CORRECT",
          "feedback": "પ્રશ્નવાર ટૂંકી સમીક્ષા",
          "missing_points": []
        }}
      ]
    }}
  ]
}}
"""
    contents.append(prompt)

    # 1. પ્રશ્નપત્ર ઉમેરો
    contents.append("--- [Question Paper Pages Below] ---")
    for b in question_paper_bytes_list:
        comp_b = quick_compress_image(b)
        contents.append(types.Part.from_bytes(data=comp_b, mime_type="image/jpeg"))

    # 2. આન્સર કી ઉમેરો
    contents.append("--- [Model Answer Key Pages Below] ---")
    for b in answer_key_bytes_list:
        comp_b = quick_compress_image(b)
        contents.append(types.Part.from_bytes(data=comp_b, mime_type="image/jpeg"))

    # 3. વિદ્યાર્થીની સપ્લીમેન્ટરી ઉમેરો
    contents.append("--- [Student Supplementary Pages Below] ---")
    for b in student_supplementary_bytes_list:
        comp_b = quick_compress_image(b)
        contents.append(types.Part.from_bytes(data=comp_b, mime_type="image/jpeg"))

    models_pool = ["gemini-3.6-flash", "gemini-3.1-pro-preview"]
    last_err = None

    for model_id in models_pool:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_id,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                if response and response.text:
                    return json.loads(response.text.strip())
            except Exception as e:
                last_err = e
                print(f"[{model_id}] Full-Auto Eval Error: {e}")
                if "503" in str(e) or "UNAVAILABLE" in str(e):
                    time.sleep(1.5)
                else:
                    break

    raise RuntimeError(f"સંપૂર્ણ ઓટો-ઇવેલ્યુએશનમાં ખામી આવી: {last_err}")