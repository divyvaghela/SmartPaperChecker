import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, AlertCircle, Award, FileText, Download, Layers, 
  UserCheck, BarChart3, Clock, CheckCircle2, RefreshCw, Edit3, 
  ShieldCheck, ExternalLink, LogIn, LogOut, User, Lock, Mail, 
  PlusCircle, Trash2, ListChecks, BookOpen, Images, FileSpreadsheet, Eye
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

export default function App() {
  const [activeTab, setActiveTab] = useState('supplementary');

  // --- Modal State for Viewing Uploaded Pages ---
  const [selectedImageModal, setSelectedImageModal] = useState(null);

  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('paper_checker_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('paper_checker_token') || '');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);

  // Auth Form
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('TEACHER');
  const [authRollNo, setAuthRollNo] = useState('');

  // --- Supplementary Multi-Page Exam Builder State ---
  const [examTitle, setExamTitle] = useState('Mid-Term Examination 2026');
  const [subject, setSubject] = useState('Computer Science');
  const [studentName, setStudentName] = useState('Rahul Sharma');
  const [rollNo, setRollNo] = useState('101');

  const [sections, setSections] = useState([
    {
      section_name: 'Section A (ટૂંકા પ્રશ્નો)',
      questions: [
        {
          q_id: 'Q1',
          question: 'કમ્પ્યુટરના મુખ્ય ઘટકો (Components) કયા છે?',
          model_answer: 'ઇનપુટ ડિવાઇસ (કીબોર્ડ, માઉસ), CPU, આઉટપુટ ડિવાઇસ (મોનિટર), સ્ટોરેજ ડિવાઇસ.',
          max_marks: 2
        },
        {
          q_id: 'Q2',
          question: 'RAM અને ROM વચ્ચેનો તફાવત જણાવો.',
          model_answer: 'RAM અસ્થાયી (Volatile) છે જ્યારે ROM કાયમી (Non-Volatile) મેમરી છે.',
          max_marks: 2
        }
      ]
    },
    {
      section_name: 'Section B (વિસ્તૃત પ્રશ્નો)',
      questions: [
        {
          q_id: 'Q3',
          question: 'ઓપરેટિંગ સિસ્ટમની મુખ્ય જવાબદારીઓ સમજાવો.',
          model_answer: 'પ્રોસેસ મેનેજમેન્ટ, મેમરી મેનેજમેન્ટ, ફાઇલ સિસ્ટમ કંટ્રોલ અને સિક્યોરિટી પૂરી પાડવી.',
          max_marks: 5
        }
      ]
    }
  ]);

  const [supplementaryFiles, setSupplementaryFiles] = useState([]);
  const [supplementaryPreviews, setSupplementaryPreviews] = useState([]);
  const [suppLoading, setSuppLoading] = useState(false);
  const [suppResult, setSuppResult] = useState(null);

  // --- Single Evaluation State (Legacy fallback) ---
  const [question, setQuestion] = useState('કમ્પ્યુટરના મુખ્ય ઘટકો કયા છે?');
  const [modelAnswer, setModelAnswer] = useState('ઇનપુટ, આઉટપુટ, સીપીયુ અને મેમરી.');
  const [maxMarks, setMaxMarks] = useState(5);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Single Audit
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
  const suppReportRef = useRef(null);

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

  // --- Dynamic Section & Question Builder Handlers ---
  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        section_name: `Section ${String.fromCharCode(65 + prev.length)}`,
        questions: [
          {
            q_id: `Q${prev.reduce((acc, s) => acc + s.questions.length, 0) + 1}`,
            question: '',
            model_answer: '',
            max_marks: 5
          }
        ]
      }
    ]);
  };

  const removeSection = (sIndex) => {
    if (sections.length <= 1) {
      alert('ઓછામાં ઓછો એક સેક્શન હોવો જરૂરી છે.');
      return;
    }
    setSections((prev) => prev.filter((_, idx) => idx !== sIndex));
  };

  const updateSectionName = (sIndex, name) => {
    setSections((prev) => {
      const copy = [...prev];
      copy[sIndex].section_name = name;
      return copy;
    });
  };

  const addQuestionToSection = (sIndex) => {
    setSections((prev) => {
      const copy = [...prev];
      const totalQ = copy.reduce((acc, s) => acc + s.questions.length, 0) + 1;
      copy[sIndex].questions.push({
        q_id: `Q${totalQ}`,
        question: '',
        model_answer: '',
        max_marks: 5
      });
      return copy;
    });
  };

  const removeQuestionFromSection = (sIndex, qIndex) => {
    setSections((prev) => {
      const copy = [...prev];
      if (copy[sIndex].questions.length <= 1) {
        alert('દરેક સેક્શનમાં ઓછામાં ઓછો એક પ્રશ્ન હોવો જોઈએ.');
        return prev;
      }
      copy[sIndex].questions = copy[sIndex].questions.filter((_, idx) => idx !== qIndex);
      return copy;
    });
  };

  const updateQuestion = (sIndex, qIndex, field, val) => {
    setSections((prev) => {
      const copy = [...prev];
      copy[sIndex].questions[qIndex][field] = field === 'max_marks' ? (parseFloat(val) || 0) : val;
      return copy;
    });
  };

  // --- Multi-Page File Selection Handlers (Append Mode) ---
  const handleSupplementaryFiles = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0) {
      setSupplementaryFiles((prev) => [...prev, ...newFiles]);
      setSupplementaryPreviews((prev) => [
        ...prev,
        ...newFiles.map((f) => URL.createObjectURL(f))
      ]);
    }
  };

  const removeSupplementaryFile = (idx) => {
    setSupplementaryFiles((prev) => prev.filter((_, i) => i !== idx));
    setSupplementaryPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- Evaluate Multi-Page Supplementary ---
  const handleEvaluateSupplementary = async () => {
    if (supplementaryFiles.length === 0) {
      alert('કૃપા કરીને સપ્લીમેન્ટરીના પાના (૧ કે તેથી વધુ ફોટા) અપલોડ કરો.');
      return;
    }

    setSuppLoading(true);
    setSuppResult(null);

    const formData = new FormData();
    supplementaryFiles.forEach((file) => {
      formData.append('files', file);
    });

    formData.append('student_name', studentName);
    formData.append('roll_no', rollNo);
    formData.append('subject', subject);

    const examPayload = {
      exam_title: examTitle,
      subject: subject,
      sections: sections
    };
    formData.append('exam_payload_json', JSON.stringify(examPayload));

    try {
      const res = await fetch('http://localhost:8000/api/evaluate-supplementary', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setSuppResult(data.data);
      } else {
        alert('મૂલ્યાંકનમાં ખામી: ' + (data.detail || 'Failed'));
      }
    } catch (err) {
      alert('સર્વર સાથે સંપર્ક ન થઈ શક્યો. ખાતરી કરો કે બેકએન્ડ ચાલુ છે.');
    } finally {
      setSuppLoading(false);
    }
  };

  const downloadSupplementaryPDF = async () => {
    if (!suppReportRef.current) return;
    try {
      const dataUrl = await toPng(suppReportRef.current, { cacheBust: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();

      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const pdfHeight = (img.height * pdfWidth) / img.width;
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${studentName.replace(/\s+/g, '_')}_Official_Marksheet.pdf`);
      };
    } catch (err) {
      alert('PDF ડાઉનલોડ કરવામાં ક્ષતિ આવી.');
    }
  };

  // --- Single Paper Legacy Handlers ---
  const handleSingleEvaluate = async () => {
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
        alert('ભૂલ: ' + (resData.detail || 'Error'));
      }
    } catch (err) {
      alert('સર્વર કનેક્શન ક્ષતિ.');
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
      }
    } catch (err) {
      alert('વેરિફિકેશન સેવ કરવામાં ક્ષતિ આવી.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleBatchEvaluate = async () => {
    if (batchFiles.length === 0) {
      alert('કૃપા કરીને પેપર્સ પસંદ કરો.');
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
      }
    } catch (err) {
      alert('બેચ મૂલ્યાંકન નિષ્ફળ.');
    } finally {
      setBatchLoading(false);
    }
  };

  const totalCalculatedMax = sections.reduce(
    (sum, sec) => sum + sec.questions.reduce((qSum, q) => qSum + (parseFloat(q.max_marks) || 0), 0),
    0
  );

  const isTeacherOrAdmin = !currentUser || currentUser.role === 'TEACHER' || currentUser.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="mb-6 border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">SmartPaperChecker</h1>
            <p className="text-sm text-slate-500">મલ્ટિલિંગ્યુઅલ (ગુજરાતી / ઇંગ્લિશ) AI પરીક્ષા મૂલ્યાંકન & ERP સિસ્ટમ</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-1.5 bg-slate-200 p-1.5 rounded-xl">
              {isTeacherOrAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab('supplementary')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'supplementary' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-indigo-600" /> એક્ઝામ & સપ્લીમેન્ટરી (Multi-Page)
                  </button>
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

            {/* Auth Profile */}
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

        {/* --- 1. Supplementary Multi-Page Exam Builder (Core Feature) --- */}
        {activeTab === 'supplementary' && isTeacherOrAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Exam Schema & Multi-Page Supplementary Upload */}
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <BookOpen className="w-5 h-5 text-indigo-600" /> પ્રશ્નપત્ર બિલ્ડર & સપ્લીમેન્ટરી ચેકિંગ
                </h2>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                  કુલ ગુણ: {totalCalculatedMax}
                </span>
              </div>

              {/* Exam Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">પરીક્ષાનું નામ</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
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
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">વિદ્યાર્થીનું નામ</label>
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
              </div>

              {/* Sections & Questions */}
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    સેક્શન્સ & પ્રશ્નોની રૂપરેખા (Sections: {sections.length})
                  </h3>
                  <button
                    onClick={addSection}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + નવો સેક્શન ઉમેરો
                  </button>
                </div>

                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {sections.map((sec, sIdx) => (
                    <div key={sIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex justify-between items-center border-b pb-2">
                        <input
                          type="text"
                          className="text-xs font-bold text-indigo-800 bg-white border rounded px-2 py-1 outline-none w-2/3"
                          value={sec.section_name}
                          onChange={(e) => updateSectionName(sIdx, e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => addQuestionToSection(sIdx)}
                            className="text-[11px] font-bold text-indigo-600 bg-white border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-50 cursor-pointer"
                          >
                            + પ્રશ્ન
                          </button>
                          <button
                            onClick={() => removeSection(sIdx)}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="સેક્શન ડિલીટ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Questions inside section */}
                      <div className="space-y-2">
                        {sec.questions.map((q, qIdx) => (
                          <div key={qIdx} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                            <div className="flex justify-between items-center">
                              <input
                                type="text"
                                className="w-16 text-xs font-bold text-indigo-700 border rounded p-1"
                                value={q.q_id}
                                onChange={(e) => updateQuestion(sIdx, qIdx, 'q_id', e.target.value)}
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-slate-500">ગુણ:</span>
                                <input
                                  type="number"
                                  min="1"
                                  className="w-12 text-center text-xs font-bold border rounded p-1"
                                  value={q.max_marks}
                                  onChange={(e) => updateQuestion(sIdx, qIdx, 'max_marks', e.target.value)}
                                />
                                <button
                                  onClick={() => removeQuestionFromSection(sIdx, qIdx)}
                                  className="text-slate-300 hover:text-rose-500 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <input
                              type="text"
                              placeholder="પ્રશ્ન વિગત..."
                              className="w-full border rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                              value={q.question}
                              onChange={(e) => updateQuestion(sIdx, qIdx, 'question', e.target.value)}
                            />

                            <textarea
                              rows={2}
                              placeholder="સાચો આદર્શ ઉત્તર (Model Answer / Rubric)..."
                              className="w-full border rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                              value={q.model_answer}
                              onChange={(e) => updateQuestion(sIdx, qIdx, 'model_answer', e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-Page Supplementary Upload */}
              <div className="border-t pt-3 space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Images className="w-4 h-4 text-indigo-600" /> વિદ્યાર્થીની સપ્લીમેન્ટરી (તમામ પાના એકસાથે)
                  </span>
                  <span className="text-indigo-600 font-semibold text-xs">
                    {supplementaryFiles.length} પેજ પસંદ કરેલ
                  </span>
                </label>

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleSupplementaryFiles}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 cursor-pointer"
                />

                {supplementaryPreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2 max-h-36 overflow-y-auto">
                    {supplementaryPreviews.map((url, idx) => (
                      <div key={idx} className="relative group border rounded-lg overflow-hidden bg-slate-50">
                        <img src={url} alt={`Page ${idx + 1}`} className="h-20 w-full object-cover" />
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 rounded font-bold">
                          P{idx + 1}
                        </span>
                        <button
                          onClick={() => removeSupplementaryFile(idx)}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 opacity-80 hover:opacity-100 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleEvaluateSupplementary}
                disabled={suppLoading || supplementaryFiles.length === 0}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition flex justify-center items-center gap-2 disabled:bg-slate-400 cursor-pointer text-sm shadow-md"
              >
                {suppLoading ? 'AI આખી સપ્લીમેન્ટરી સ્કેન કરી રહ્યું છે...' : (
                  <>
                    <Upload className="w-4 h-4" /> આખી સપ્લીમેન્ટરી ચેક કરો (Non-Linear Scan)
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Comprehensive Multi-Page Marksheet & Non-Linear Mapping */}
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <Award className="w-5 h-5 text-indigo-600" /> એકેડેમિક ગુણાંક & પરીક્ષા રિપોર્ટ
                </h2>
                {suppResult && (
                  <button
                    onClick={downloadSupplementaryPDF}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF માર્કશીટ
                  </button>
                )}
              </div>

              {!suppResult && !suppLoading && (
                <div className="text-center py-40 text-slate-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30 text-indigo-400" />
                  પ્રશ્નપત્ર તૈયાર કરી વિદ્યાર્થીની સપ્લીમેન્ટરીના પાના અપલોડ કરો.
                </div>
              )}

              {suppLoading && (
                <div className="text-center py-40 text-slate-500 animate-pulse">
                  <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-3 text-indigo-600" />
                  <p className="font-semibold text-sm text-slate-700">સપ્લીમેન્ટરીના તમામ પાનાનું વિશ્લેષણ થઈ રહ્યું છે...</p>
                  <p className="text-xs text-slate-400 mt-1">આડાઅવળા લખેલા જવાબો શોધીને પ્રશ્ન સાથે જોડાઈ રહ્યા છે.</p>
                </div>
              )}

              {suppResult && (
                <div ref={suppReportRef} className="space-y-4">
                  
                  {/* Overall Result Banner */}
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">{studentName} (રોલ: {rollNo})</p>
                      <h3 className="text-sm font-extrabold text-indigo-950">{examTitle} - {subject}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">કુલ પાના તપાસ્યા: {supplementaryFiles.length}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold uppercase text-indigo-600">મેળવેલા ગુણ</span>
                      <div className="text-3xl font-black text-indigo-950">
                        {suppResult.total_obtained_marks} / {suppResult.total_max_marks}
                      </div>
                    </div>
                  </div>

                  {/* Sections Breakdown */}
                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                    {suppResult.sections_evaluation?.map((sec, sIdx) => (
                      <div key={sIdx} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3">
                        <div className="font-bold text-xs text-indigo-900 border-b pb-1">
                          {sec.section_name}
                        </div>

                        <div className="space-y-2">
                          {sec.questions?.map((q, qIdx) => (
                            <div key={qIdx} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-800 flex items-center gap-2">
                                  <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-[11px]">
                                    {q.q_id}
                                  </span>
                                  {q.question}
                                </span>
                                <span className={`px-2 py-0.5 rounded font-black ${
                                  q.obtained_marks >= q.max_marks ? 'bg-emerald-100 text-emerald-800' :
                                  q.obtained_marks > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {q.obtained_marks} / {q.max_marks}
                                </span>
                              </div>

                              {q.page_reference && (
                                <span className="inline-block text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                                  સપ્લીમેન્ટરી સંદર્ભ: {q.page_reference}
                                </span>
                              )}

                              {q.student_answer_snippet && (
                                <div className="p-2 bg-slate-50 rounded text-xs text-slate-600">
                                  <span className="font-bold text-slate-500">વિદ્યાર્થીનો જવાબ: </span>
                                  {q.student_answer_snippet}
                                </div>
                              )}

                              <div className="text-xs text-slate-700">
                                <span className="font-semibold text-slate-500">શિક્ષક ટિપ્પણી: </span>
                                {q.feedback}
                              </div>

                              {q.missing_points && q.missing_points.length > 0 && (
                                <div className="text-[11px] text-amber-700 bg-amber-50/80 p-2 rounded">
                                  <span className="font-bold">ખૂટતા મુદ્દાઓ: </span>
                                  {q.missing_points.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Overall Feedback */}
                  {suppResult.overall_summary && (
                    <div className="p-3 bg-slate-50 border rounded-xl text-xs text-slate-700">
                      <span className="font-bold text-slate-600 block mb-1">આખરી મૂલ્યાંકન સારાંશ:</span>
                      {suppResult.overall_summary}
                    </div>
                  )}

                  {/* View Supplementary Pages (In-App Modal Popup) */}
                  <div className="pt-3 border-t flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">મૂળ પાના તપાસો:</span>
                    {(suppResult.pages_urls && suppResult.pages_urls.length > 0
                      ? suppResult.pages_urls
                      : supplementaryPreviews
                    ).map((pageUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const target = pageUrl || supplementaryPreviews[i];
                          if (target) setSelectedImageModal(target);
                        }}
                        className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 font-semibold cursor-pointer transition shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" /> Page {i + 1}
                      </button>
                    ))}
                  </div>

                </div>
              )}
            </div>

          </div>
        )}

        {/* --- 2. Single Paper Evaluation Tab --- */}
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
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setImageFile(f);
                      setPreviewUrl(URL.createObjectURL(f));
                    }
                  }}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              {previewUrl && (
                <div className="mt-2">
                  <img src={previewUrl} alt="Paper Preview" className="max-h-36 rounded-lg border object-contain mx-auto" />
                </div>
              )}

              <button
                onClick={handleSingleEvaluate}
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

            {/* Result */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" /> મૂલ્યાંકન પરિણામ
                </h2>
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
                    <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">મેળવેલા ગુણ</span>
                        <div className="text-3xl font-extrabold text-indigo-950">
                          {isVerified ? editedMarks : result.obtained_marks} / {result.max_marks}
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        {result.evaluation_status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">શિક્ષક ટિપ્પણી</h3>
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border">
                        {isVerified ? editedFeedback : result.teacher_feedback}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-indigo-600" /> શિક્ષક રિવ્યુ & ઓવરરાઇડ (Audit)
                    </h3>
                    <div className="flex items-center justify-between gap-4">
                      <label className="text-xs font-semibold text-slate-600">ગુણ સુધારો:</label>
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
                    <textarea
                      rows={2}
                      value={editedFeedback}
                      onChange={(e) => {
                        setEditedFeedback(e.target.value);
                        setIsVerified(false);
                      }}
                      className="w-full border rounded-lg p-2 text-xs bg-white text-slate-800 outline-none"
                    />
                    {!isVerified ? (
                      <button
                        onClick={handleVerifyAndFinalize}
                        disabled={verifyLoading}
                        className="w-full bg-emerald-600 text-white font-semibold py-2 rounded-xl hover:bg-emerald-700 transition text-xs cursor-pointer"
                      >
                        {verifyLoading ? 'સેવિંગ...' : 'માર્ક્સ કન્ફર્મ & સેવ કરો'}
                      </button>
                    ) : (
                      <div className="p-2 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-lg text-center">
                        પ્રમાણિત થઈ ગયું છે.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 3. Batch Mode Tab --- */}
        {activeTab === 'batch' && isTeacherOrAdmin && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" /> આખા ક્લાસ માટે બેચ પેપર મૂલ્યાંકન
            </h2>
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
                  onChange={(e) => setBatchFiles(Array.from(e.target.files))}
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
                      <th className="p-3">મેળવેલા ગુણ</th>
                      <th className="p-3">સ્ટેટસ</th>
                      <th className="p-3">શિક્ષક ટિપ્પણી</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {batchResults.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-indigo-700">{r.student_id}</td>
                        <td className="p-3 font-bold">{r.obtained_marks} / {r.max_marks}</td>
                        <td className="p-3 font-bold">{r.evaluation_status}</td>
                        <td className="p-3 text-slate-700">{r.teacher_feedback}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- 4. Analytics & ERP History Dashboard --- */}
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

            {isTeacherOrAdmin && analytics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold uppercase text-slate-400">કુલ તપાસેલા પેપર્સ</p>
                  <p className="text-3xl font-extrabold text-indigo-600 mt-2">{analytics.total_papers}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold uppercase text-slate-400">સરેરાશ માર્ક્સ</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{analytics.average_marks}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold uppercase text-slate-400">સૌથી વધુ ગુણ</p>
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
                        <th className="p-3">વિષય / એક્ઝામ</th>
                        <th className="p-3">ગુણ</th>
                        <th className="p-3">પાના</th>
                        <th className="p-3">તારીખ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {submissions.map((sub) => (
                        <tr key={sub._id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{sub.student_name}</td>
                          <td className="p-3 text-indigo-600 font-medium">{sub.roll_no}</td>
                          <td className="p-3">
                            <span className="font-medium text-slate-800">{sub.subject}</span>
                            {sub.exam_title && <span className="block text-[11px] text-slate-400">{sub.exam_title}</span>}
                          </td>
                          <td className="p-3 font-bold">{sub.obtained_marks} / {sub.max_marks}</td>
<td className="p-3">
  {Array.isArray(sub.pages_urls) && sub.pages_urls.filter(Boolean).length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {sub.pages_urls.filter(Boolean).map((url, pIdx) => (
        <button
          key={pIdx}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedImageModal(url);
          }}
          className="text-[11px] bg-indigo-50 hover:bg-indigo-200 text-indigo-700 border border-indigo-300 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 cursor-pointer transition shadow-xs active:scale-95"
          title={`Page ${pIdx + 1} જુઓ`}
        >
          <Eye className="w-3 h-3 text-indigo-600" /> P{pIdx + 1}
        </button>
      ))}
    </div>
  ) : sub.image_url ? (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedImageModal(sub.image_url);
      }}
      className="text-xs text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1 font-semibold cursor-pointer"
    >
      <Eye className="w-3 h-3" /> પેપર જુઓ
    </button>
  ) : (
    <span className="text-slate-400 text-xs">-</span>
  )}
</td>                          <td className="p-3 text-slate-400">
                            {sub.created_at ? new Date(sub.created_at).toLocaleDateString('gu-IN') : '-'}
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

        {/* --- Authentication Modal --- */}
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

        {/* --- In-App Full Image Modal (Lightbox Viewer) --- */}
{/* Lightbox Viewer Modal */}
{selectedImageModal && (
  <div 
    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    onClick={() => setSelectedImageModal(null)}
  >
    <div 
      className="bg-white rounded-2xl p-4 max-w-4xl w-full max-h-[90vh] flex flex-col relative shadow-2xl border border-slate-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center pb-3 border-b">
        <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-600" /> ઓરિજિનલ પેપર પાનું
        </span>
        <button 
          type="button"
          onClick={() => setSelectedImageModal(null)}
          className="text-slate-500 hover:text-rose-600 text-xl font-black px-2 py-1 rounded-lg cursor-pointer"
        >
          ✕
        </button>
      </div>
      <div className="overflow-auto flex-1 p-2 text-center bg-slate-100 rounded-xl my-2">
        <img 
          src={selectedImageModal} 
          alt="Answer Sheet Preview" 
          className="max-h-[75vh] mx-auto object-contain rounded-lg border border-slate-300 shadow" 
        />
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
}