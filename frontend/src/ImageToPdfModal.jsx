import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { Images, FileDown, CheckCircle, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export default function ImageToPdfModal({ isOpen, onClose, onPdfGenerated, defaultFileName = 'student_sheet.pdf' }) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newImgs = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setSelectedImages((prev) => [...prev, ...newImgs]);
  };

  const moveItem = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selectedImages.length) return;
    const updated = [...selectedImages];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setSelectedImages(updated);
  };

  const removeItem = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const convertToPdf = async () => {
    if (selectedImages.length === 0) {
      alert('કૃપા કરીને ઓછામાં ઓછો એક ફોટો ઉમેરો.');
      return;
    }

    setGenerating(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < selectedImages.length; i++) {
        if (i > 0) pdf.addPage();

        const imgData = await new Promise((resolve) => {
          const img = new Image();
          img.src = selectedImages[i].url;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve({
              base64: canvas.toDataURL('image/jpeg', 0.85),
              width: img.width,
              height: img.height
            });
          };
        });

        // Aspect ratio જાળવીને પેજ પર ફિટ કરવું
        const ratio = Math.min(pageWidth / imgData.width, pageHeight / imgData.height);
        const renderWidth = imgData.width * ratio;
        const renderHeight = imgData.height * ratio;
        const xOffset = (pageWidth - renderWidth) / 2;
        const yOffset = (pageHeight - renderHeight) / 2;

        pdf.addImage(imgData.base64, 'JPEG', xOffset, yOffset, renderWidth, renderHeight);
      }

      // PDF Blob મેળવી File ઓબ્જેક્ટ બનાવવો
      const pdfBlob = pdf.output('blob');
      const generatedFile = new File([pdfBlob], defaultFileName, { type: 'application/pdf' });

      // વિદ્યાર્થીના કમ્પ્યુટર/મોબાઈલમાં સેવ (Download) પણ કરી આપવું
      pdf.save(defaultFileName);

      // પેરેન્ટ કમ્પોનન્ટને નવી ફાઇલ પાસ કરવી
      onPdfGenerated(generatedFile);
      onClose();
    } catch (err) {
      alert('PDF બનાવવામાં ક્ષતિ આવી: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl p-6 relative flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center pb-3 border-b">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Images className="w-5 h-5 text-indigo-600" /> પેપર ફોટામાંથી PDF બનાવો
            </h3>
            <p className="text-xs text-slate-500">બધા પાના સિલેક્ટ કરો, ક્રમ ગોઠવો અને 1 ક્લિકમાં PDF તૈયાર કરો.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
        </div>

        <div className="my-4 space-y-3 flex-1 overflow-y-auto pr-1">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFilesChange}
            className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
          />

          {selectedImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative border rounded-xl p-2 bg-slate-50 flex flex-col items-center shadow-xs">
                  <img src={img.url} alt={`Page ${idx + 1}`} className="w-full h-32 object-contain rounded-lg bg-white border" />
                  <div className="flex items-center justify-between w-full mt-2 px-1 text-xs">
                    <span className="font-bold text-slate-700">Page {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => moveItem(idx, 1)} disabled={idx === selectedImages.length - 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeItem(idx)} className="p-1 hover:bg-rose-100 text-rose-600 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
            રદ કરો
          </button>
          <button
            onClick={convertToPdf}
            disabled={generating || selectedImages.length === 0}
            className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition disabled:bg-slate-300"
          >
            {generating ? 'PDF બની રહી છે...' : (
              <>
                <FileDown className="w-4 h-4" /> PDF સેવ કરો & જોડો
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}