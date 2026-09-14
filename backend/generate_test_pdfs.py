from fpdf import FPDF
import os

class AcademicPDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 14)
        self.cell(0, 8, 'GUJARAT UNIVERSITY - MID TERM EXAM 2026', align='C', new_x='LMARGIN', new_y='NEXT')
        self.set_font('Helvetica', '', 10)
        self.cell(0, 6, 'Subject: Computer Science & Operating Systems | Max Marks: 20', align='C', new_x='LMARGIN', new_y='NEXT')
        self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')

def create_qp():
    pdf = AcademicPDF()
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, 'MASTER QUESTION PAPER', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(3)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Section A (Short Questions - 3 Marks Each)', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 10)
    pdf.multi_cell(0, 6, 'Q1. Explain the main differences between RAM and ROM memory. [3 Marks]\nQ2. What are the three primary components of a Computer CPU? [3 Marks]')
    pdf.ln(4)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Section B (Long Questions - 7 Marks Each)', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 10)
    pdf.multi_cell(0, 6, 'Q3. Describe the essential functions of an Operating System with suitable points. [7 Marks]\nQ4. Differentiate between Process and Thread in modern computing. [7 Marks]')

    pdf.output("test_qp.pdf")
    print("Created test_qp.pdf")

def create_answer_key():
    pdf = AcademicPDF()
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 8, 'OFFICIAL MODEL ANSWER KEY & MARKING RUBRIC', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(3)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Q1 Rubric (RAM vs ROM - 3 Marks):', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, '- RAM is Volatile (loses data on power loss); ROM is Non-Volatile (permanent). (1.5 Marks)\n- RAM supports read/write; ROM is typically read-only (BIOS/Firmware). (1.5 Marks)')
    pdf.ln(3)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Q2 Rubric (CPU Components - 3 Marks):', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, '- ALU (Arithmetic Logic Unit): Arithmetic and logical calculations. (1 Mark)\n- Control Unit (CU): Direction, synchronization, decoding of instructions. (1 Mark)\n- Registers / Cache: Ultra-fast temporary internal registers. (1 Mark)')
    pdf.ln(3)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Q3 Rubric (OS Functions - 7 Marks):', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, '- Process Management & CPU scheduling. (2 Marks)\n- Memory Management (RAM allocation, paging, virtual memory). (2 Marks)\n- File System Management & Directory indexing. (1.5 Marks)\n- Device / I/O handling & Security protection. (1.5 Marks)')
    pdf.ln(3)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Q4 Rubric (Process vs Thread - 7 Marks):', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, '- Process: Independent program in execution with separate memory space. Heavyweight. (3.5 Marks)\n- Thread: Lightweight sub-process sharing the same process address space and resources. (3.5 Marks)')

    pdf.output("test_answer_key.pdf")
    print("Created test_answer_key.pdf")

def create_student_101():
    # 2 પાનાની ઉત્તરવહી - ઉત્કૃષ્ટ વિદ્યાર્થી
    pdf = AcademicPDF()
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 7, 'STUDENT SUPPLEMENTARY SHEET (Roll No: 101 - Rahul Sharma)', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(2)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Answer 1:', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, 'RAM is Volatile memory, meaning when the power is turned off, all contents are erased. It supports both read and write operations and stores currently running programs.\nROM is Non-Volatile permanent memory where startup firmware like BIOS is stored. It cannot be easily overwritten.')
    pdf.ln(3)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Answer 3 (Continued on Page 2):', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, 'Operating System acts as an intermediary between user and hardware.\n1. Process Management: Handles creation, termination, and CPU scheduling of jobs.\n2. Memory Management: Tracks memory addresses and allocates RAM space to software.')

    # Page 2
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 7, 'Roll No: 101 - Supplementary Page 2', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(2)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Answer 3 (Continued):', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, '3. File System: Provides structured directories, files, permissions, and storage retrieval.\n4. Device Management: I/O controllers, drivers, buffering, and peripherals security.')
    pdf.ln(3)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Answer 2 (Out of Order):', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, 'CPU components include:\n1. Arithmetic Logic Unit (ALU)\n2. Control Unit (CU)\n3. Internal CPU Registers')

    pdf.output("101_Rahul_Sharma.pdf")
    print("Created 101_Rahul_Sharma.pdf")

def create_student_102():
    # સરેરાશ વિદ્યાર્થી - ખૂટતા મુદ્દા સાથે
    pdf = AcademicPDF()
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 7, 'STUDENT SUPPLEMENTARY SHEET (Roll No: 102 - Priya Patel)', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(2)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Answer 1:', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, 'RAM is primary memory and ROM is secondary memory. RAM is fast.')
    pdf.ln(3)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Answer 2:', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, 'The CPU has ALU and Control Unit. (Student missed Registers)')
    pdf.ln(3)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Answer 3:', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, 'Operating system is Windows and Linux. It manages computer files and turns on the PC.')

    pdf.output("102_Priya_Patel.pdf")
    print("Created 102_Priya_Patel.pdf")

def create_student_103():
    # અન્ય વિદ્યાર્થી (બેચ મોડ ટેસ્ટિંગ માટે)
    pdf = AcademicPDF()
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 7, 'STUDENT SUPPLEMENTARY SHEET (Roll No: 103 - Amit Verma)', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(2)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Answer 4 (Thread vs Process):', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, 'A process is an entire application executing in its own memory space. A thread is a lightweight execution unit inside a process that shares memory and files with other threads.')
    pdf.ln(3)

    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(0, 6, 'Answer 2:', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.multi_cell(0, 5, 'CPU parts:\n- ALU (Math)\n- CU (Control)\n- Registers (Data storage)')

    pdf.output("103_Amit_Verma.pdf")
    print("Created 103_Amit_Verma.pdf")

if __name__ == "__main__":
    create_qp()
    create_answer_key()
    create_student_101()
    create_student_102()
    create_student_103()
    print("\nAll 5 testing PDFs generated successfully in current folder!")