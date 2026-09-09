import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, AlertCircle, Award, FileText, Download, Layers, 
  UserCheck, BarChart3, Clock, CheckCircle2, RefreshCw, Edit3, 
  ShieldCheck, ExternalLink, LogIn, LogOut, User, Lock, Mail, ShieldAlert
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

export default function App() {
  const [activeTab, setActiveTab] = useState('single');

  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('paper_checker_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('paper_checker_token') || '');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authLoading, setAuthLoading] = useState(false);

  // Auth Form fields
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('TEACHER'); // 'TEACHER' | 'ADMIN' | 'STUDENT'
  const [authRollNo, setAuthRollNo] = useState('');

  // --- Single Evaluation State ---
  const [studentName, setStudentName] = useState('Rahul Sharma');
  const [rollNo, setRollNo] = useState('101');
  const [subject, setSubject] = useState('Computer Science');
  const [question, setQuestion] = useState('કમ્પ્યુટરના મુખ્ય ઘટકો (Components) કયા છે?');
  const [modelAnswer, setModelAnswer] = useState('મુખ્ય ઘટકોમાં ઇનપુટ ડિવાઇસ (કીબોર્ડ, માઉસ), CPU, આઉટપુટ ડિવાઇસ (મોનિટર, પ્રિન્ટર) અને સ્ટોરેજ ડિવાઇસ આવે છે.');
  const [maxMarks, setMaxMarks] = useState(5);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Teacher Override & Verification state
  const [isVerified, setIsVerified] = useState(false);
  const [editedMarks, setEditedMarks] = useState(0);
  const [editedFeedback, setEditedFeedback] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  // --- Batch mode state ---
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState([]);

  // --- Analytics & History state ---
  const [analytics, setAnalytics] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const reportRef = useRef(null);

  // --- Auth Handlers ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);

    const endpoint = authMode === 'login' ? 'http://localhost:8000/api/auth/login' : 'http://localhost:8000/api/auth/register';
    const payload = authMode === 'login' 
      ? { email: authEmail, password: authPassword }
      : { 
          name: authName, 
          email: authEmail, 
          password: authPassword, 
          role: authRole,
          roll_no: authRole === 'STUDENT' ? authRollNo : null 
        };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('paper_checker_token', data.token);
        localStorage.setItem('paper_checker_user', JSON.stringify(data.user));
        setToken(data.token);
        setCurrentUser(data.user);
        setAuthModalOpen(false);

        // If student logged in, auto fill their details
        if (data.user.role === 'STUDENT') {
          setStudentName(data.user.name);
          if (data.user.roll_no) setRollNo(data.user.roll_no);
          setActiveTab('analytics');
        }
      } else {
        alert('પ્રમાણીકરણ નિષ્ફળ: ' + (data.detail || 'ખામી સર્જાઈ'));
      }
    } catch (err) {
      alert('સર્વર કનેક્શન એરર. ખાતરી કરો કે બેકએન્ડ ચાલુ છે.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('paper_checker_token');
    localStorage.removeItem('paper_checker_user');
    setToken('');
    setCurrentUser(null);
  };

  const fetchAnalyticsAndHistory = async () => {
    setHistoryLoading(true);
    try {
      const [analyticsRes, submissionsRes] = await Promise.all([
        fetch('http://localhost:8000/api/analytics'),
        fetch('http://localhost:8000/api/submissions')
      ]);

      const analyticsData = await analyticsRes.json();
      const submissionsData = await submissionsRes.json();

      if (analyticsData.success) setAnalytics(analyticsData.data);
      if (submissionsData.success) {
        // If student, filter only their papers
        if (currentUser && currentUser.role === 'STUDENT') {
          const filtered = submissionsData.data.filter(
            (s) => s.roll_no === currentUser.roll_no || s.student_name.toLowerCase() === currentUser.name.toLowerCase()
          );
          setSubmissions(filtered);
        } else {
          setSubmissions(submissionsData.data);
        }
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsAndHistory();
    }
  }, [activeTab, currentUser]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleBatchFileChange = (e) => {
    setBatchFiles(Array.from(e.target.files));
  };

  const handleEvaluate = async () => {
    if (!imageFile) {
      alert('કૃપા કરીને પેપરનો ફોટો અપલોડ કરો.');
      return;
    }

    setLoading(true);
    setResult(null);
    setIsVerified(false);

    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('student_name', studentName);
    formData.append('roll_no', rollNo);
    formData.append('subject', subject);
    formData.append('question', question);
    formData.append('model_answer', modelAnswer);
    formData.append('max_marks', maxMarks);

    try {
      const response = await fetch('http://localhost:8000/api/evaluate', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      const resData = await response.json();
      if (resData.success) {
        setResult(resData.data);
        setEditedMarks(resData.data.obtained_marks ?? 0);
        setEditedFeedback(resData.data.teacher_feedback ?? '');
      } else {
        alert('મૂલ્યાંકનમાં ભૂલ આવી: ' + (resData.detail || 'Unknown Error'));
      }
    } catch (err) {
      alert('સર્વર સાથે કનેક્ટ ન થઈ શક્યું. ખાતરી કરો કે Python સર્વર ચાલુ છે.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndFinalize = async () => {
    if (!result || !result.submission_id) {
      setIsVerified(true);
      return;
    }

    setVerifyLoading(true);
    const marksNum = parseFloat(editedMarks) || 0;
    const computedStatus = marksNum >= parseFloat(maxMarks) ? 'CORRECT' : marksNum > 0 ? 'PARTIAL' : 'INCORRECT';

    try {
      const response = await fetch('http://localhost:8000/api/submissions/verify', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          submission_id: result.submission_id,
          obtained_marks: marksNum,
          teacher_feedback: editedFeedback,
          evaluation_status: computedStatus
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setIsVerified(true);
        setResult((prev) => ({
          ...prev,
          obtained_marks: marksNum,
          teacher_feedback: editedFeedback,
          evaluation_status: computedStatus
        }));
      } else {
        alert('સેવ કરવામાં એરર: ' + (resData.detail || 'Failed'));
      }
    } catch (err) {
      alert('વેરિફિકેશન સેવ કરવામાં સમસ્યા આવી.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleBatchEvaluate = async () => {
    if (batchFiles.length === 0) {
      alert('કૃપા કરીને ઓછામાં ઓછું એક પેપર પસંદ કરો.');
      return;
    }

    setBatchLoading(true);
    setBatchResults([]);

    const formData = new FormData();
    batchFiles.forEach((f) => formData.append('files', f));
    formData.append('subject', subject);
    formData.append('question', question);
    formData.append('model_answer', modelAnswer);
    formData.append('max_marks', maxMarks);

    try {
      const response = await fetch('http://localhost:8000/api/evaluate-batch', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      const resData = await response.json();
      if (resData.success) {
        setBatchResults(resData.data);
      } else {
        alert('બેચ મૂલ્યાંકનમાં ભૂલ આવી.');
      }
    } catch (err) {
      alert('બેચ સર્વર કનેક્શન એરર.');
    } finally {
      setBatchLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      const dataUrl = await toPng(reportRef.current, { cacheBust: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();

      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const pdfHeight = (img.height * pdfWidth) / img.width;
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${studentName.replace(/\s+/g, '_')}_Verified_Report.pdf`);
      };
    } catch (err) {
      alert('PDF ડાઉનલોડ કરવામાં સમસ્યા આવી.');
    }
  };

  const exportCSV = () => {
    if (batchResults.length === 0) return;
    const headers = ['Student ID', 'File Name', 'Obtained Marks', 'Max Marks', 'Status', 'Feedback', 'Image URL'];
    const rows = batchResults.map((r) => [
      r.student_id,
      `"${r.filename}"`,
      r.obtained_marks,
      r.max_marks,
      r.evaluation_status,
      `"${(r.teacher_feedback || '').replace(/"/g, '""')}"`,
      `"${r.image_url || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Batch_Result_${subject}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isTeacherOrAdmin = !currentUser || currentUser.role === 'TEACHER' || currentUser.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-6 border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">SmartPaperChecker</h1>
            <p className="text-sm text-slate-500">મલ્ટિલિંગ્યુઅલ (ગુજરાતી / ઇંગ્લિશ) AI પરીક્ષા મૂલ્યાંકન & ERP સિસ્ટમ</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Navigation Tabs */}
            <div className="flex gap-1.5 bg-slate-200 p-1.5 rounded-xl">
              {isTeacherOrAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab('single')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'single' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" /> સિંગલ પેપર
                  </button>
                  <button
                    onClick={() => setActiveTab('batch')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'batch' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-4 h-4" /> બેચ મોડ
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'analytics' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" /> {currentUser?.role === 'STUDENT' ? 'મારો રિપોર્ટ' : 'એનાલિટિક્સ & હિસ્ટ્રી'}
              </button>
            </div>

            {/* User Auth Profile Badge / Login Button */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{currentUser.name}</p>
                  <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                    {currentUser.role} {currentUser.roll_no ? `(${currentUser.roll_no})` : ''}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-sm cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> લૉગિન / સાઈનઅપ
              </button>
            )}
          </div>
        </header>

        {/* 1. Single Mode */}
        {activeTab === 'single' && isTeacherOrAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> પરીક્ષા વિગત & આન્સર-કી
              </h2>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">વિદ્યાર્થી</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">રોલ નં</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">વિષય</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>

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
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">કુલ ગુણ</label>
                <input
                  type="number"
                  className="w-full border rounded-lg p-2.5 text-sm outline-none"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">આન્સર-શીટ (ફોટો)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              {previewUrl && (
                <div className="mt-2">
                  <p className="text-xs text-slate-400 mb-1">પેપર પ્રિવ્યુ:</p>
                  <img src={previewUrl} alt="Paper Preview" className="max-h-36 rounded-lg border object-contain mx-auto" />
                </div>
              )}

              <button
                onClick={handleEvaluate}
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition flex justify-center items-center gap-2 disabled:bg-slate-400 cursor-pointer"
              >
                {loading ? 'AI પેપર તપાસી રહ્યું છે...' : (
                  <>
                    <Upload className="w-5 h-5" /> પેપર ચેક કરો
                  </>
                )}
              </button>
            </div>

            {/* Evaluation Result Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" /> મૂલ્યાંકન પરિણામ
                </h2>
                {result && (
                  <button
                    onClick={downloadPDF}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> PDF રિપોર્ટ
                  </button>
                )}
              </div>

              {!result && !loading && (
                <div className="text-center py-24 text-slate-400">પેપર અપલોડ કરીને મૂલ્યાંકન શરૂ કરો.</div>
              )}

              {loading && (
                <div className="text-center py-24 text-slate-500 animate-pulse">પેપર ચકાસાઈ રહ્યું છે...</div>
              )}

              {result && (
                <div className="space-y-4">
                  <div ref={reportRef} className="p-4 bg-white border border-slate-100 rounded-xl space-y-4">
                    <div className="border-b pb-3 flex justify-between items-center text-xs text-slate-600">
                      <div>
                        <p><span className="font-bold">વિદ્યાર્થી:</span> {studentName}</p>
                        <p><span className="font-bold">રોલ નં:</span> {rollNo}</p>
                      </div>
                      <div className="text-right">
                        <p><span className="font-bold">વિષય:</span> {subject}</p>
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 mt-1 bg-emerald-100 text-emerald-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" /> Teacher Verified
                          </span>
                        ) : (
                          <span className="inline-block mt-1 bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
                            AI Draft (Pending Review)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">મેળવેલા ગુણ</span>
                        <div className="text-3xl font-extrabold text-indigo-950">
                          {isVerified ? editedMarks : result.obtained_marks} / {result.max_marks}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        (isVerified ? (parseFloat(editedMarks) >= maxMarks ? 'CORRECT' : parseFloat(editedMarks) > 0 ? 'PARTIAL' : 'INCORRECT') : result.evaluation_status) === 'CORRECT' ? 'bg-green-100 text-green-700' :
                        (isVerified ? (parseFloat(editedMarks) >= maxMarks ? 'CORRECT' : parseFloat(editedMarks) > 0 ? 'PARTIAL' : 'INCORRECT') : result.evaluation_status) === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isVerified ? (parseFloat(editedMarks) >= maxMarks ? 'CORRECT' : parseFloat(editedMarks) > 0 ? 'PARTIAL' : 'INCORRECT') : result.evaluation_status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">AI દ્વારા વંચાયેલું લખાણ</h3>
                      <div className="p-3 bg-slate-50 border rounded-lg text-sm text-slate-700 whitespace-pre-wrap">{result.extracted_text || 'કોઈ લખાણ મળ્યું નથી'}</div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">શિક્ષક ટિપ્પણી / Feedback</h3>
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border">
                        {isVerified ? editedFeedback : result.teacher_feedback}
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

                    {result.image_url && (
                      <div className="pt-2">
                        <a
                          href={result.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> ક્લાઉડ પર સાચવેલી મૂળ આન્સર-શીટ જુઓ
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Teacher Override & Audit Controls */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-indigo-600" /> શિક્ષક રિવ્યુ & ઓવરરાઇડ (Audit)
                    </h3>

                    <div className="flex items-center justify-between gap-4">
                      <label className="text-xs font-semibold text-slate-600">ગુણ સુધારો (Manual Marks):</label>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={maxMarks}
                        value={editedMarks}
                        onChange={(e) => {
                          setEditedMarks(e.target.value);
                          setIsVerified(false);
                        }}
                        className="w-24 border rounded-lg p-1.5 text-center font-bold text-slate-800 bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">આખરી ફીડબેક સંપાદિત કરો:</label>
                      <textarea
                        rows={2}
                        value={editedFeedback}
                        onChange={(e) => {
                          setEditedFeedback(e.target.value);
                          setIsVerified(false);
                        }}
                        className="w-full border rounded-lg p-2 text-xs bg-white text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {!isVerified ? (
                      <button
                        onClick={handleVerifyAndFinalize}
                        disabled={verifyLoading}
                        className="w-full bg-emerald-600 text-white font-semibold py-2.5 rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:bg-slate-400"
                      >
                        <CheckCircle2 className="w-4 h-4" /> {verifyLoading ? 'સેવિંગ...' : 'માર્ક્સ કન્ફર્મ & સેવ કરો (Verify & Finalize)'}
                      </button>
                    ) : (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg text-center flex items-center justify-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> આ પરિણામ શિક્ષક દ્વારા પ્રમાણિત થઈ ગયું છે.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Batch Mode */}
        {activeTab === 'batch' && isTeacherOrAdmin && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" /> આખા ક્લાસ માટે બેચ પેપર મૂલ્યાંકન
                </h2>
                <p className="text-xs text-slate-500">એકસાથે મલ્ટિપલ આન્સર-શીટ્સ અપલોડ કરો અને સામૂહિક પરિણામ મેળવો.</p>
              </div>
              {batchResults.length > 0 && (
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" /> CSV ડાઉનલોડ કરો
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">પ્રશ્ન</label>
                <textarea
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">મોડેલ આન્સર</label>
                <textarea
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={3}
                  value={modelAnswer}
                  onChange={(e) => setModelAnswer(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">બધા પેપર પસંદ કરો</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleBatchFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 mb-3"
                />
                <button
                  onClick={handleBatchEvaluate}
                  disabled={batchLoading || batchFiles.length === 0}
                  className="w-full bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition disabled:bg-slate-300 cursor-pointer"
                >
                  {batchLoading ? `પેપર્સ ચકાસી રહ્યું છે (${batchFiles.length})...` : `બધા (${batchFiles.length}) પેપર તપાસો`}
                </button>
              </div>
            </div>

            {batchResults.length > 0 && (
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-800 text-xs font-bold uppercase border-b">
                    <tr>
                      <th className="p-3">રોલ નં</th>
                      <th className="p-3">ફાઇલ નામ</th>
                      <th className="p-3">મેળવેલા ગુણ</th>
                      <th className="p-3">સ્ટેટસ</th>
                      <th className="p-3">મૂળ શીટ</th>
                      <th className="p-3">શિક્ષક ટિપ્પણી</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {batchResults.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-indigo-700">{r.student_id}</td>
                        <td className="p-3 text-slate-500 truncate max-w-xs">{r.filename}</td>
                        <td className="p-3 font-bold">{r.obtained_marks} / {r.max_marks}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            r.evaluation_status === 'CORRECT' ? 'bg-green-100 text-green-700' :
                            r.evaluation_status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {r.evaluation_status}
                          </span>
                        </td>
                        <td className="p-3">
                          {r.image_url ? (
                            <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-semibold">
                              જુઓ ↗
                            </a>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-slate-700">{r.teacher_feedback}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. Analytics & ERP History Dashboard */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-600" /> 
                {currentUser?.role === 'STUDENT' ? 'મારો પરીક્ષા રિપોર્ટ' : 'એકેડેમિક એનાલિટિક્સ & પેપર હિસ્ટ્રી'}
              </h2>
              <button
                onClick={fetchAnalyticsAndHistory}
                className="flex items-center gap-1.5 text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> રિફ્રેશ
              </button>
            </div>

            {/* Metric KPI Cards (Only for Teacher / Admin) */}
            {isTeacherOrAdmin && analytics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold uppercase text-slate-400">કુલ તપાસેલા પેપર્સ</p>
                  <p className="text-3xl font-extrabold text-indigo-600 mt-2">{analytics.total_papers}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold uppercase text-slate-400">સરેરાશ માર્ક્સ (Class Average)</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{analytics.average_marks}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold uppercase text-slate-400">સૌથી વધુ ગુણ (Highest)</p>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-2">{analytics.highest_marks}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold uppercase text-slate-400">સ્ટેટસ બ્રેકડાઉન</p>
                  <div className="flex gap-2 mt-3 text-xs font-bold">
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded">✓ {analytics.breakdown.correct}</span>
                    <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded">~ {analytics.breakdown.partial}</span>
                    <span className="text-rose-700 bg-rose-50 px-2 py-1 rounded">✕ {analytics.breakdown.incorrect}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Submissions History Table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-md font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" /> 
                {currentUser?.role === 'STUDENT' ? 'તમારા તપાસાયેલા પેપર્સ' : 'અગાઉ તપાસેલા પેપર્સનો ડેટાબેઝ રેકોર્ડ'}
              </h3>

              {historyLoading ? (
                <p className="text-sm text-slate-400 py-8 text-center">ડેટા લોડ થઈ રહ્યો છે...</p>
              ) : submissions.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">હજુ સુધી કોઈ પેપર્સ સેવ થયેલ નથી.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b">
                      <tr>
                        <th className="p-3">વિદ્યાર્થી</th>
                        <th className="p-3">રોલ નં</th>
                        <th className="p-3">વિષય</th>
                        <th className="p-3">ગુણ</th>
                        <th className="p-3">સ્ટેટસ</th>
                        <th className="p-3">આન્સર-શીટ</th>
                        <th className="p-3">તારીખ / સમય</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {submissions.map((sub) => (
                        <tr key={sub._id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{sub.student_name}</td>
                          <td className="p-3 text-indigo-600 font-medium">{sub.roll_no}</td>
                          <td className="p-3">{sub.subject}</td>
                          <td className="p-3 font-bold">{sub.obtained_marks} / {sub.max_marks}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              sub.evaluation_status === 'CORRECT' ? 'bg-green-100 text-green-700' :
                              sub.evaluation_status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {sub.evaluation_status}
                            </span>
                          </td>
                          <td className="p-3">
                            {sub.image_url ? (
                              <a
                                href={sub.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1"
                              >
                                ઓરિજિનલ પેપર <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400">
                            {sub.created_at ? new Date(sub.created_at).toLocaleString('gu-IN') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Authentication Modal (Login / Register) --- */}
        {authModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative">
              <button
                onClick={() => setAuthModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>

              <h2 className="text-xl font-bold text-slate-800 mb-1">
                {authMode === 'login' ? 'સિસ્ટમ લૉગિન' : 'નવું એકાઉન્ટ રજીસ્ટર કરો'}
              </h2>
              <p className="text-xs text-slate-500 mb-6">SmartPaperChecker ERP પ્લેટફોર્મ એક્સેસ કરો</p>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">પૂરું નામ</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          placeholder="દા.ત. પ્રો. મહેશ પટેલ"
                          className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">તમારી ભૂમિકા (Role)</label>
                      <select
                        value={authRole}
                        onChange={(e) => setAuthRole(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="TEACHER">શિક્ષક (Teacher / Evaluator)</option>
                        <option value="ADMIN">એડમિન / પ્રિન્સિપાલ (Admin)</option>
                        <option value="STUDENT">વિદ્યાર્થી (Student)</option>
                      </select>
                    </div>

                    {authRole === 'STUDENT' && (
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">રોલ નં</label>
                        <input
                          type="text"
                          required
                          placeholder="દા.ત. 101"
                          className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={authRollNo}
                          onChange={(e) => setAuthRollNo(e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">ઈમેલ એડ્રેસ</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="name@school.edu"
                      className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">પાસવર્ડ</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition cursor-pointer disabled:bg-slate-400 text-sm"
                >
                  {authLoading ? 'પ્રોસેસિંગ...' : (authMode === 'login' ? 'લૉગિન કરો' : 'ખાતું બનાવો')}
                </button>
              </form>

              <div className="mt-4 text-center text-xs text-slate-500">
                {authMode === 'login' ? (
                  <p>
                    ખાતું નથી?{' '}
                    <button
                      onClick={() => setAuthMode('register')}
                      className="text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      અહીં રજીસ્ટર કરો
                    </button>
                  </p>
                ) : (
                  <p>
                    પહેલેથી ખાતું છે?{' '}
                    <button
                      onClick={() => setAuthMode('login')}
                      className="text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      લૉગિન કરો
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}