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
    """ઇમેજ ઓપ્ટિમાઇઝ કરે છે જેથી ઝડપથી ટ્રાન્સફર અને પ્રોસેસ થાય."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    h, w = img.shape[:2]
    max_dim = 1024
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        
    _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 85])
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

    # માત્ર સક્રિય અને સપોર્ટેડ મોડેલ્સ
    models_pool = ["gemini-3.6-flash", "gemini-3.1-pro-preview"]
    
    last_err = None
    for model_id in models_pool:
        # ટ્રાફિક સ્પાઇક (503) વખતે 2 વાર retry
        for attempt in range(2):
            try:
                print(f"[{model_id}] પ્રયાસ {attempt + 1}...")
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
                    result = json.loads(response.text.strip())
                    print(f"[{model_id}] સફળતાપૂર્વક મૂલ્યાંકન થયું!")
                    return result

            except Exception as e:
                last_err = e
                err_str = str(e)
                print(f"[{model_id}] ભૂલ: {err_str}")
                if "503" in err_str or "UNAVAILABLE" in err_str:
                    time.sleep(1.5)  # ટ્રાફિક હળવો થવા માટે સેકન્ડ રાહ જુઓ
                else:
                    break  # 404 કે અન્ય એરર હોય તો સીધા આગલા મોડેલ પર જાઓ

    raise RuntimeError(f"સર્વર હાલ વ્યસ્ત છે. કૃપા કરીને થોડીવાર પછી પ્રયાસ કરો: {last_err}")