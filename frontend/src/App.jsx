import React, { useState } from 'react';
import { Upload, AlertCircle, Award, FileText } from 'lucide-react';

export default function App() {
  const [question, setQuestion] = useState('કમ્પ્યુટરના મુખ્ય ઘટકો (Components) કયા છે?');
  const [modelAnswer, setModelAnswer] = useState('મુખ્ય ઘટકોમાં ઇનપુટ ડિવાઇસ (કીબોર્ડ, માઉસ), CPU, આઉટપુટ ડિવાઇસ (મોનિટર, પ્રિન્ટર) અને સ્ટોરેજ ડિવાઇસ આવે છે.');
  const [maxMarks, setMaxMarks] = useState(5);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleEvaluate = async () => {
    if (!imageFile) {
      alert('કૃપા કરીને પેપરનો ફોટો અપલોડ કરો.');
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('question', question);
    formData.append('model_answer', modelAnswer);
    formData.append('max_marks', maxMarks);

    try {
      const response = await fetch('http://localhost:8000/api/evaluate', {
        method: 'POST',
        body: formData,
      });

      const resData = await response.json();
      if (resData.success) {
        setResult(resData.data);
      } else {
        alert('મૂલ્યાંકનમાં ભૂલ આવી: ' + (resData.detail || 'Unknown Error'));
      }
    } catch (err) {
      alert('સર્વર સાથે કનેક્ટ ન થઈ શક્યું. ખાતરી કરો કે Python સર્વર ચાલુ છે.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">IndicGrade AI</h1>
            <p className="text-sm text-slate-500">ગુજરાતી & મલ્ટિલિંગ્યુઅલ હસ્તલિખિત પેપર ઇવેલ્યુએટર</p>
          </div>
          <span className="bg-indigo-100 text-indigo-800 text-xs px-3 py-1 rounded-full font-semibold">Live System</span>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ઇનપુટ પેનલ */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" /> પરીક્ષા વિગત & આન્સર-કી
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">પ્રશ્ન</label>
              <textarea
                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                rows={2}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">સાચો જવાબ (Model Answer)</label>
              <textarea
                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                rows={3}
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">કુલ ગુણ (Max Marks)</label>
              <input
                type="number"
                className="w-full border rounded-lg p-2.5 text-sm outline-none"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">વિદ્યાર્થીની આન્સર-શીટ (ફોટો)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            {previewUrl && (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-1">પેપર પ્રિવ્યુ:</p>
                <img src={previewUrl} alt="Paper Preview" className="max-h-48 rounded-lg border object-contain mx-auto" />
              </div>
            )}

            <button
              onClick={handleEvaluate}
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition flex justify-center items-center gap-2 disabled:bg-slate-400"
            >
              {loading ? 'AI પેપર તપાસી રહ્યું છે...' : (
                <>
                  <Upload className="w-5 h-5" /> પેપર ચેક કરો
                </>
              )}
            </button>
          </div>

          {/* પરિણામ પેનલ */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" /> મૂલ્યાંકન પરિણામ
            </h2>

            {!result && !loading && (
              <div className="text-center py-20 text-slate-400">
                ડાબી બાજુ પેપર અપલોડ કરીને "પેપર ચેક કરો" બટન દબાવો.
              </div>
            )}

            {loading && (
              <div className="text-center py-20 text-slate-500 animate-pulse">
                હસ્તલેખન વંચાઈ રહ્યું છે અને આન્સર-કી સાથે ગુણ ગણાઈ રહ્યા છે...
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">મેળવેલા ગુણ</span>
                    <div className="text-3xl font-extrabold text-indigo-950">
                      {result.obtained_marks} / {result.max_marks}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    result.evaluation_status === 'CORRECT' ? 'bg-green-100 text-green-700' :
                    result.evaluation_status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {result.evaluation_status}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">AI દ્વારા વંચાયેલું લખાણ</h3>
                  <div className="p-3 bg-slate-50 border rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                    {result.extracted_text || 'કંઈ વાંચી શકાયું નથી'}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">શિક્ષક ટિપ્પણી / Feedback</h3>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border">
                    {result.teacher_feedback}
                  </p>
                </div>

                {result.missing_points && result.missing_points.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">જવાબમાં ખૂટતા મુદ્દાઓ</h3>
                    <ul className="space-y-1">
                      {result.missing_points.map((pt, idx) => (
                        <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}