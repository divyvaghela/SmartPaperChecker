import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Award, FileText, Download, Layers, 
  UserCheck, BarChart3, Clock, RefreshCw, Edit3, 
  LogIn, LogOut, User, Lock, Mail, 
  BookOpen, Images, Eye, FileQuestion, KeyRound, Sparkles, Building2
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import ImageToPdfModal from './ImageToPdfModal';

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

  // --- Exam Info State ---
  const [examTitle, setExamTitle] = useState('Mid-Term Examination 2026');
  const [subject, setSubject] = useState('Computer Science');
  const [studentName, setStudentName] = useState('Rahul Sharma');
  const [rollNo, setRollNo] = useState('101');

  const [pdfConverterOpen, setPdfConverterOpen] = useState(false);

  // --- 3-Way Auto Upload States (Zero-Typing Mode) ---
  const [qpFiles, setQpFiles] = useState([]);
  const [qpPreviews, setQpPreviews] = useState([]);

  const [akFiles, setAkFiles] = useState([]);
  const [akPreviews, setAkPreviews] = useState([]);

  const [suppFiles, setSuppFiles] = useState([]);
  const [suppPreviews, setSuppPreviews] = useState([]);

  const [autoLoading, setAutoLoading] = useState(false);
  const [evalResult, setEvalResult] = useState(null);

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
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState([]);

  // --- Analytics & History state ---
  const [analytics, setAnalytics] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- SaaS Master Admin & Tenant State ---
  const [institutionsList, setInstitutionsList] = useState([]);
  const [newInstForm, setNewInstForm] = useState({ name: '', code: '', adminEmail: '', subscriptionPlan: 'BASIC' });
  const [activeInstitution, setActiveInstitution] = useState(() => {
    const saved = localStorage.getItem('paper_checker_institution');
    return saved ? JSON.parse(saved) : { code: 'gtu', name: 'Gujarat University' };
  });

  const reportRef = useRef(null);
  const suppReportRef = useRef(null);

  const [batchQpFiles, setBatchQpFiles] = useState([]);
  const [batchAkFiles, setBatchAkFiles] = useState([]);
  const [batchStudentFiles, setBatchStudentFiles] = useState([]);
  const [batchExamTitle, setBatchExamTitle] = useState('Mid-Term Examination 2026');
  const [batchSubject, setBatchSubject] = useState('Computer Science');

  // --- Helper for Tenant-Aware Fetch ---
  const fetchWithTenant = async (url, options = {}) => {
    const headers = {
      'x-institution-code': activeInstitution.code,
      ...(options.headers || {})
    };
    return fetch(url, { ...options, headers });
  };

  // --- SaaS Master Admin Fetchers ---
  const fetchInstitutions = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/institutions');
      const data = await res.json();
      setInstitutionsList(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'saas_admin') {
      fetchInstitutions();
    }
  }, [activeTab]);

  const handleRegisterInstitution = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/institutions/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInstForm)
      });
      const data = await res.json();
      if (res.ok) {
        alert('Institution registered successfully!');
        fetchInstitutions();
        setNewInstForm({ name: '', code: '', adminEmail: '', subscriptionPlan: 'BASIC' });
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInstitutionSwitch = (inst) => {
    setActiveInstitution(inst);
    localStorage.setItem('paper_checker_institution', JSON.stringify(inst));
    window.location.reload();
  };

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
        fetchWithTenant('http://localhost:8000/api/analytics'),
        fetchWithTenant('http://localhost:8000/api/submissions')
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

  // --- Auto-Upload Evaluation Handler ---
  const handleAutoEvaluate = async () => {
    if (qpFiles.length === 0) {
      alert('કૃપા કરીને પ્રશ્નપત્ર (Question Paper) અપલોડ કરો.');
      return;
    }
    if (akFiles.length === 0) {
      alert('કૃપા કરીને મોડેલ આન્સર-કી (Answer Key) અપલોડ કરો.');
      return;
    }
    if (suppFiles.length === 0) {
      alert('કૃપા કરીને વિદ્યાર્થીની સપ્લીમેન્ટરી (Student Supplementary) અપલોડ કરો.');
      return;
    }

    setAutoLoading(true);
    setEvalResult(null);

    const formData = new FormData();
    qpFiles.forEach((f) => formData.append('question_paper_files', f));
    akFiles.forEach((f) => formData.append('answer_key_files', f));
    suppFiles.forEach((f) => formData.append('student_files', f));

    formData.append('student_name', studentName);
    formData.append('roll_no', rollNo);
    formData.append('subject', subject);
    formData.append('exam_title', examTitle);

    try {
      const res = await fetchWithTenant('http://localhost:8000/api/evaluate-auto-upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setEvalResult(data.data);
      } else {
        alert('મૂલ્યાંકનમાં ખામી: ' + (data.detail || 'Failed'));
      }
    } catch (err) {
      alert('સર્વર સાથે સંપર્ક ન થઈ શક્યો. ખાતરી કરો કે બેકએન્ડ ચાલુ છે.');
    } finally {
      setAutoLoading(false);
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
      const response = await fetchWithTenant('http://localhost:8000/api/evaluate', {
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
      const response = await fetchWithTenant('http://localhost:8000/api/submissions/verify', {
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

  const isTeacherOrAdmin = !currentUser || currentUser.role === 'TEACHER' || currentUser.role === 'ADMIN';

  const isPdfUrl = (url) => {
    if (!url) return false;
    return url.startsWith('data:application/pdf') || url.toLowerCase().includes('.pdf');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="mb-6 border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">SmartPaperChecker</h1>
            <p className="text-sm text-slate-500">મલ્ટિલિંગ્યુઅલ (ગુજરાતી / ઇંગ્લિશ) AI પરીક્ષા મૂલ્યાંકન & ERP SaaS સિસ્ટમ</p>
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
                    <Sparkles className="w-4 h-4 text-indigo-600" /> ઓટો અપલોડ મોડ (No Typing)
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
              <button
                onClick={() => setActiveTab('saas_admin')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'saas_admin' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4 text-indigo-600" /> SaaS Master Admin
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

        {/* --- SaaS Master Admin Panel Tab --- */}
        {activeTab === 'saas_admin' && (
          <div className="space-y-6 bg-white p-6 rounded-2xl border shadow-sm">
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">SaaS Master Admin: Tenant Management</h3>
                <p className="text-xs text-slate-400">Onboard and monitor all subscribed colleges and institutions</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-900">
                Active Tenant Context: <span className="font-bold uppercase text-indigo-700">{activeInstitution.code}</span>
              </div>
            </div>

            {/* Onboard New Institution Form */}
            <form onSubmit={handleRegisterInstitution} className="bg-slate-50 p-4 rounded-xl border grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Institution Name</label>
                <input
                  type="text"
                  placeholder="e.g. Gujarat University"
                  value={newInstForm.name}
                  onChange={e => setNewInstForm({...newInstForm, name: e.target.value})}
                  className="w-full border p-2 rounded-lg bg-white font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Unique Code</label>
                <input
                  type="text"
                  placeholder="e.g. gtu"
                  value={newInstForm.code}
                  onChange={e => setNewInstForm({...newInstForm, code: e.target.value})}
                  className="w-full border p-2 rounded-lg bg-white font-bold uppercase"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Admin Email</label>
                <input
                  type="email"
                  placeholder="admin@college.edu"
                  value={newInstForm.adminEmail}
                  onChange={e => setNewInstForm({...newInstForm, adminEmail: e.target.value})}
                  className="w-full border p-2 rounded-lg bg-white font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Plan</label>
                <select
                  value={newInstForm.subscriptionPlan}
                  onChange={e => setNewInstForm({...newInstForm, subscriptionPlan: e.target.value})}
                  className="w-full border p-2 rounded-lg bg-white font-bold"
                >
                  <option value="BASIC">BASIC</option>
                  <option value="PREMIUM">PREMIUM</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end">
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl uppercase tracking-wider text-xs cursor-pointer">
                  + Register New Institution
                </button>
              </div>
            </form>

            {/* Institutions Table */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="p-3">Institution Name</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Admin Email</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {institutionsList.length === 0 ? (
                    <tr><td colSpan={6} className="p-4 text-center text-slate-400">No institutions registered yet.</td></tr>
                  ) : (
                    institutionsList.map(inst => (
                      <tr key={inst._id} className="hover:bg-slate-50 font-medium">
                        <td className="p-3 font-bold text-slate-800">{inst.name}</td>
                        <td className="p-3 uppercase text-indigo-600 font-bold">{inst.code}</td>
                        <td className="p-3 text-slate-600">{inst.adminEmail}</td>
                        <td className="p-3"><span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">{inst.subscriptionPlan}</span></td>
                        <td className="p-3"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">{inst.status}</span></td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleInstitutionSwitch(inst)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg font-bold text-[10px] cursor-pointer"
                          >
                            Switch Tenant
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 1. Zero-Typing 3-Way Auto Upload Mode --- */}
        {activeTab === 'supplementary' && isTeacherOrAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: 3-Way Upload Form */}
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <Sparkles className="w-5 h-5 text-indigo-600" /> સ્માર્ટ ઓટો-મૂલ્યાંકન (Zero-Typing)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">પ્રશ્નપત્ર, આન્સર-કી અને સપ્લીમેન્ટરી અપલોડ કરો — ટાઈપ કરવાની જરૂર નથી.</p>
                </div>
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

              {/* 1. Question Paper Upload */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <FileQuestion className="w-4 h-4 text-indigo-600" /> ૧. પ્રશ્નપત્ર અપલોડ કરો (Question Paper)
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-600">{qpFiles.length} પસંદ</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setQpFiles((prev) => [...prev, ...files]);
                      setQpPreviews((prev) => [
                        ...prev,
                        ...files.map((f) => ({
                          url: URL.createObjectURL(f),
                          isPdf: f.type === 'application/pdf' || f.name.endsWith('.pdf'),
                          name: f.name
                        }))
                      ]);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-800 cursor-pointer"
                />
                {qpPreviews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {qpPreviews.map((item, idx) => (
                      <div key={idx} className="relative group w-14 h-14 border rounded overflow-hidden flex-shrink-0 bg-white">
                        {item.isPdf ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-rose-50 text-rose-600 p-1 text-center">
                            <span className="text-[10px] font-black uppercase">PDF</span>
                            <span className="text-[8px] truncate max-w-[48px] text-slate-600">{item.name}</span>
                          </div>
                        ) : (
                          <img src={item.url || item} alt={`QP ${idx + 1}`} className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setQpFiles((p) => p.filter((_, i) => i !== idx));
                            setQpPreviews((p) => p.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Answer Key Upload */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-emerald-600" /> ૨. આદર્શ ઉત્તરવહી / આન્સર-કી (Answer Key)
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600">{akFiles.length} પસંદ</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setAkFiles((prev) => [...prev, ...files]);
                      setAkPreviews((prev) => [
                        ...prev,
                        ...files.map((f) => ({
                          url: URL.createObjectURL(f),
                          isPdf: f.type === 'application/pdf' || f.name.endsWith('.pdf'),
                          name: f.name
                        }))
                      ]);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 cursor-pointer"
                />
                {akPreviews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {akPreviews.map((item, idx) => (
                      <div key={idx} className="relative group w-14 h-14 border rounded overflow-hidden flex-shrink-0 bg-white">
                        {item.isPdf ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-rose-50 text-rose-600 p-1 text-center">
                            <span className="text-[10px] font-black uppercase">PDF</span>
                            <span className="text-[8px] truncate max-w-[48px] text-slate-600">{item.name}</span>
                          </div>
                        ) : (
                          <img src={item.url || item} alt={`AK ${idx + 1}`} className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setAkFiles((p) => p.filter((_, i) => i !== idx));
                            setAkPreviews((p) => p.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Student Supplementary Upload */}
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Images className="w-4 h-4 text-amber-600" /> ૩. વિદ્યાર્થીની સપ્લીમેન્ટરી (Student Supplementary)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPdfConverterOpen(true)}
                      className="text-[11px] bg-amber-100 text-amber-900 hover:bg-amber-200 px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      + ફોટામાંથી PDF બનાવો
                    </button>
                    <span className="text-[11px] font-semibold text-amber-700">{suppFiles.length} પસંદ</span>
                  </div>
                </div>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setSuppFiles((prev) => [...prev, ...files]);
                      setSuppPreviews((prev) => [
                        ...prev,
                        ...files.map((f) => ({
                          url: URL.createObjectURL(f),
                          isPdf: f.type === 'application/pdf' || f.name.endsWith('.pdf'),
                          name: f.name
                        }))
                      ]);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 cursor-pointer"
                />
                {suppPreviews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {suppPreviews.map((item, idx) => (
                      <div key={idx} className="relative group w-14 h-14 border rounded overflow-hidden flex-shrink-0 bg-white">
                        {item.isPdf ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-rose-50 text-rose-600 p-1 text-center">
                            <span className="text-[10px] font-black uppercase">PDF</span>
                            <span className="text-[8px] truncate max-w-[48px] text-slate-600">{item.name}</span>
                          </div>
                        ) : (
                          <img src={item.url || item} alt={`Supp ${idx + 1}`} className="w-full h-full object-cover" />
                        )}
                        <span className="absolute bottom-0 left-0 bg-black/70 text-white text-[8px] px-1 font-bold">P{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSuppFiles((p) => p.filter((_, i) => i !== idx));
                            setSuppPreviews((p) => p.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}  
              </div>

              <button
                onClick={handleAutoEvaluate}
                disabled={autoLoading || qpFiles.length === 0 || akFiles.length === 0 || suppFiles.length === 0}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition flex justify-center items-center gap-2 disabled:bg-slate-400 cursor-pointer text-sm shadow-md"
              >
                {autoLoading ? 'AI પ્રશ્નપત્ર, આન્સર-કી અને સપ્લીમેન્ટરી સ્કેન કરી રહ્યું છે...' : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" /> આખું પેપર સ્કેન કરીને સીધું ચેક કરો
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Comprehensive Result */}
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <Award className="w-5 h-5 text-indigo-600" /> એકેડેમિક ગુણાંક & પરીક્ષા રિપોર્ટ
                </h2>
                {evalResult && (
                  <button
                    onClick={downloadSupplementaryPDF}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF માર્કશીટ
                  </button>
                )}
              </div>

              {!evalResult && !autoLoading && (
                <div className="text-center py-40 text-slate-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30 text-indigo-400" />
                  પ્રશ્નપત્ર, આન્સર-કી અને સપ્લીમેન્ટરીના ફોટા અથવા PDF અપલોડ કરીને મૂલ્યાંકન શરૂ કરો.
                </div>
              )}

              {autoLoading && (
                <div className="text-center py-40 text-slate-500 animate-pulse">
                  <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-3 text-indigo-600" />
                  <p className="font-semibold text-sm text-slate-700">AI સમગ્ર દસ્તાવેજોનું વિશ્લેષણ કરી રહ્યું છે...</p>
                  <p className="text-xs text-slate-400 mt-1">પ્રશ્નપત્રમાંથી ગુણભાર અને આન્સર-કીમાંથી સાચા જવાબો એક્સટ્રેક્ટ થઈ રહ્યા છે.</p>
                </div>
              )}

              {evalResult && (
                <div ref={suppReportRef} className="space-y-4">
                  
                  {/* Overall Result Banner */}
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">{studentName} (રોલ: {rollNo})</p>
                      <h3 className="text-sm font-extrabold text-indigo-950">{examTitle} - {subject}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">કુલ પાના તપાસ્યા: {suppFiles.length}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold uppercase text-indigo-600">મેળવેલા ગુણ</span>
                      <div className="text-3xl font-black text-indigo-950">
                        {evalResult.total_obtained_marks} / {evalResult.total_max_marks}
                      </div>
                    </div>
                  </div>

                  {/* Sections Breakdown */}
                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                    {evalResult.sections_evaluation?.map((sec, sIdx) => (
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
                  {evalResult.overall_summary && (
                    <div className="p-3 bg-slate-50 border rounded-xl text-xs text-slate-700">
                      <span className="font-bold text-slate-600 block mb-1">આખરી મૂલ્યાંકન સારાંશ:</span>
                      {evalResult.overall_summary}
                    </div>
                  )}

                  {/* View Supplementary Pages (In-App Modal Popup) */}
                  <div className="pt-3 border-t flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">મૂળ પાના તપાસો:</span>
                    {(evalResult.pages_urls && evalResult.pages_urls.length > 0
                      ? evalResult.pages_urls
                      : suppPreviews.map((p) => p.url)
                    ).map((pageUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (pageUrl) setSelectedImageModal(pageUrl);
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
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">આન્સર-શીટ (ફોટો અથવા PDF)</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
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
                  {imageFile?.type === 'application/pdf' || imageFile?.name?.endsWith('.pdf') ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-bold text-center">
                      PDF ફાઇલ પસંદ કરેલ છે: {imageFile.name}
                    </div>
                  ) : (
                    <img src={previewUrl} alt="Paper Preview" className="max-h-36 rounded-lg border object-contain mx-auto" />
                  )}
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
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" /> આખા ક્લાસ માટે બલ્ક ઓટો-મૂલ્યાંકન (Batch Mode)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  પ્રશ્નપત્ર અને આન્સર-કી ૧ જ વાર અપલોડ કરો અને આખા ક્લાસના પેપર્સ (PDF અથવા Images) એકસાથે ચેક કરો.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="પરીક્ષાનું નામ"
                  className="border rounded-lg px-2.5 py-1 text-xs outline-none"
                  value={batchExamTitle}
                  onChange={(e) => setBatchExamTitle(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="વિષય"
                  className="border rounded-lg px-2.5 py-1 text-xs outline-none"
                  value={batchSubject}
                  onChange={(e) => setBatchSubject(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Master QP */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <FileQuestion className="w-4 h-4 text-indigo-600" /> ૧. માસ્ટર પ્રશ્નપત્ર (૧ વાર)
                </label>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => setBatchQpFiles(Array.from(e.target.files || []))}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-800 cursor-pointer"
                />
                <p className="text-[11px] text-indigo-600 font-semibold">{batchQpFiles.length} પસંદ</p>
              </div>

              {/* 2. Master Answer Key */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-600" /> ૨. માસ્ટર આન્સર-કી (૧ વાર)
                </label>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => setBatchAkFiles(Array.from(e.target.files || []))}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 cursor-pointer"
                />
                <p className="text-[11px] text-emerald-600 font-semibold">{batchAkFiles.length} પસંદ</p>
              </div>

              {/* 3. All Students Papers */}
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Images className="w-4 h-4 text-amber-600" /> ૩. બધા વિદ્યાર્થીઓના પેપર્સ (PDF / Images)
                </label>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => setBatchStudentFiles(Array.from(e.target.files || []))}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 cursor-pointer"
                />
                <p className="text-[11px] text-amber-700 font-semibold">{batchStudentFiles.length} ફાઇલો પસંદ</p>
              </div>
            </div>

            <button
              onClick={async () => {
                if (batchQpFiles.length === 0 || batchAkFiles.length === 0 || batchStudentFiles.length === 0) {
                  alert('કૃપા કરીને પ્રશ્નપત્ર, આન્સર-કી અને વિદ્યાર્થીઓના પેપર્સ અપલોડ કરો.');
                  return;
                }
                setBatchLoading(true);
                setBatchResults([]);
                const formData = new FormData();
                batchQpFiles.forEach((f) => formData.append('question_paper_files', f));
                batchAkFiles.forEach((f) => formData.append('answer_key_files', f));
                batchStudentFiles.forEach((f) => formData.append('student_files', f));
                formData.append('exam_title', batchExamTitle);
                formData.append('subject', batchSubject);

                try {
                  const res = await fetchWithTenant('http://localhost:8000/api/evaluate-batch-auto', {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    body: formData,
                  });
                  const data = await res.json();
                  if (data.success) {
                    setBatchResults(data.data);
                  } else {
                    alert('બેચ મૂલ્યાંકન નિષ્ફળ: ' + (data.detail || 'Error'));
                  }
                } catch (err) {
                  alert('સર્વર સાથે સંપર્ક થઈ શક્યો નહીં.');
                } finally {
                  setBatchLoading(false);
                }
              }}
              disabled={batchLoading || batchStudentFiles.length === 0}
              className="w-full bg-indigo-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-indigo-700 transition disabled:bg-slate-400 cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {batchLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> બધા વિદ્યાર્થીઓના પેપર્સ સમાંતર તપાસાઈ રહ્યા છે...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" /> બધા પેપર એકસાથે ચેક કરો
                </>
              )}
            </button>

            {batchResults.length > 0 && (
              <div className="overflow-x-auto border rounded-xl mt-4">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-800 text-xs font-bold uppercase border-b">
                    <tr>
                      <th className="p-3">રોલ નં</th>
                      <th className="p-3">વિદ્યાર્થી</th>
                      <th className="p-3">ગુણ</th>
                      <th className="p-3">સ્ટેટસ</th>
                      <th className="p-3">શિક્ષક ટિપ્પણી</th>
                      <th className="p-3">પેપર</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {batchResults.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-indigo-700">{r.roll_no}</td>
                        <td className="p-3 font-medium text-slate-800">{r.student_name}</td>
                        <td className="p-3 font-bold">{r.obtained_marks} / {r.max_marks}</td>
                        <td className="p-3 font-bold">{r.evaluation_status}</td>
                        <td className="p-3 text-slate-700">{r.teacher_feedback}</td>
                        <td className="p-3">
                          {Array.isArray(r.pages_urls) && r.pages_urls.filter(Boolean).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {r.pages_urls.filter(Boolean).map((pUrl, pIdx) => (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => setSelectedImageModal(pUrl)}
                                  className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                                >
                                  P{pIdx + 1}
                                </button>
                              ))}
                            </div>
                          ) : r.image_url ? (
                            <button
                              type="button"
                              onClick={() => setSelectedImageModal(r.image_url)}
                              className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> જુઓ
                            </button>
                          ) : '-'}
                        </td>
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
                          </td>
                          <td className="p-3 text-slate-400">
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
              <p className="text-xs text-slate-500 mb-6">SmartPaperChecker SaaS ERP પ્લેટફોર્મ એક્સેસ કરો</p>

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
                        <option value="STUDENT you">વિદ્યાર્થી (Student)</option>
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

        {/* --- In-App Full Viewer Modal (Lightbox for Images & PDFs) --- */}
        {selectedImageModal && (
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all"
            onClick={() => setSelectedImageModal(null)}
          >
            <div 
              className="bg-white rounded-2xl p-4 max-w-4xl w-full max-h-[92vh] flex flex-col relative shadow-2xl border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b px-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-800">
                    {isPdfUrl(selectedImageModal) ? 'મૂળ દસ્તાવેજ (PDF Viewer)' : 'મૂળ ઉત્તરવહી (Original Sheet Image)'}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedImageModal(null)}
                  className="text-slate-400 hover:text-rose-600 text-lg font-bold p-1 cursor-pointer transition"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-auto flex-1 p-2 text-center bg-slate-50 rounded-xl my-2 flex items-center justify-center">
                {isPdfUrl(selectedImageModal) ? (
                  <iframe 
                    src={selectedImageModal} 
                    title="Document PDFF Viewer" 
                    className="w-full h-[78vh] rounded-lg border border-slate-200"
                  />
                ) : (
                  <img 
                    src={selectedImageModal} 
                    alt="Original Answer Sheet" 
                    className="max-h-[78vh] mx-auto object-contain rounded-lg border border-slate-200 shadow-sm" 
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- Image to PDF Generator Modal --- */}
        <ImageToPdfModal
          isOpen={pdfConverterOpen}
          onClose={() => setPdfConverterOpen(false)}
          defaultFileName={`${rollNo || '101'}_${studentName.replace(/\s+/g, '_')}_Sheet.pdf`}
          onPdfGenerated={(pdfFile) => {
            setSuppFiles([pdfFile]);
            setSuppPreviews([{
              url: URL.createObjectURL(pdfFile),
              isPdf: true,
              name: pdfFile.name
            }]);
          }}
        />

      </div>
    </div>     
  );
}