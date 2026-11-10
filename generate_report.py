import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    """Set background color of a table cell."""
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

def set_cell_margins(cell, top=80, bottom=80, left=100, right=100):
    """Set inner padding of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="DDEFE9", sz="4", val="single"):
    """Set subtle modern borders for the whole table."""
    tblPr = table._tbl.tblPr
    borders_xml = f'''
    <w:tblBorders {nsdecls("w")}>
        <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:left w:val="none"/>
        <w:right w:val="none"/>
        <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        <w:insideV w:val="none"/>
    </w:tblBorders>
    '''
    tblPr.append(parse_xml(borders_xml))

def add_callout(doc, text, title="LƯU Ý / ĐIỂM SÁNG KỸ THUẬT:"):
    """Add a professional styled callout box."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F5FBF9")
    set_cell_margins(cell, top=100, bottom=100, left=150, right=120)
    
    tcPr = cell._tc.get_or_add_tcPr()
    border_xml = f'''
    <w:tcBorders {nsdecls("w")}>
        <w:left w:val="single" w:sz="24" w:space="0" w:color="20B486"/>
        <w:top w:val="none"/>
        <w:right w:val="none"/>
        <w:bottom w:val="none"/>
    </w:tcBorders>
    '''
    tcPr.append(parse_xml(border_xml))
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    run_title = p.add_run(f"{title} ")
    run_title.font.name = "Times New Roman"
    run_title.font.bold = True
    run_title.font.size = Pt(10.5)
    run_title.font.color.rgb = RGBColor(32, 180, 134)
    
    run_text = p.add_run(text)
    run_text.font.name = "Times New Roman"
    run_text.font.size = Pt(10)
    run_text.font.color.rgb = RGBColor(50, 60, 75)
    
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)

def add_figure(doc, img_path, caption, width=Inches(5.2)):
    """Add a centered figure with a caption."""
    if not os.path.exists(img_path):
        print(f"Warning: Image {img_path} not found.")
        return
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(3)
    run = p.add_run()
    run.add_picture(img_path, width=width)
    
    cp = doc.add_paragraph()
    cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cp.paragraph_format.space_before = Pt(2)
    cp.paragraph_format.space_after = Pt(8)
    c_run = cp.add_run(caption)
    c_run.font.name = "Times New Roman"
    c_run.font.italic = True
    c_run.font.size = Pt(9.5)
    c_run.font.color.rgb = RGBColor(80, 90, 105)

def format_run(run, font_name="Times New Roman", size_pt=11.5, bold=False, italic=False, color_rgb=(16, 26, 44)):
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(*color_rgb)

def add_p(doc, text="", font_name="Times New Roman", size_pt=11.5, bold=False, italic=False, 
          color_rgb=(16, 26, 44), align=WD_ALIGN_PARAGRAPH.LEFT, space_before=0, space_after=4, line_spacing=1.15):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    if text:
        run = p.add_run(text)
        format_run(run, font_name, size_pt, bold, italic, color_rgb)
    return p

def add_bullet(doc, text="", bold_prefix="", font_name="Times New Roman", size_pt=11, space_before=0, space_after=2.5):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_b = p.add_run(bold_prefix)
        format_run(r_b, font_name, size_pt, bold=True, color_rgb=(16, 26, 44))
    if text:
        r_t = p.add_run(text)
        format_run(r_t, font_name, size_pt, bold=False, color_rgb=(40, 50, 60))
    return p

def add_h1(doc, text):
    return add_p(doc, text, font_name="Times New Roman", size_pt=14, bold=True, color_rgb=(16, 26, 44), 
                 space_before=14, space_after=6, align=WD_ALIGN_PARAGRAPH.LEFT)

def add_h2(doc, text):
    return add_p(doc, text, font_name="Times New Roman", size_pt=12.5, bold=True, color_rgb=(32, 180, 134), 
                 space_before=10, space_after=4, align=WD_ALIGN_PARAGRAPH.LEFT)

def build_report():
    print("Initializing document...")
    doc = docx.Document()

    # Configure Margins (Top 2cm, Bottom 2cm, Left 2.5cm, Right 2cm)
    for section in doc.sections:
        section.top_margin = Inches(0.79)     # 2.0 cm
        section.bottom_margin = Inches(0.79)  # 2.0 cm
        section.left_margin = Inches(0.98)    # 2.5 cm
        section.right_margin = Inches(0.79)   # 2.0 cm

    # ==========================================
    # PAGE 1: COVER PAGE
    # ==========================================
    add_p(doc, "BỘ GIÁO DỤC VÀ ĐÀO TẠO", size_pt=12, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    add_p(doc, "TRƯỜNG ĐẠI HỌC SƯ PHẠM KỸ THUẬT TP. HỒ CHÍ MINH", size_pt=13, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    add_p(doc, "KHOA ĐÀO TẠO CHẤT LƯỢNG CAO", size_pt=12, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
    add_p(doc, "NGÀNH CÔNG NGHỆ THÔNG TIN", size_pt=12, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=6)
    add_p(doc, "---------******---------", size_pt=11, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=16)

    # University Logo
    logo_path = "report_assets/page_1_0_Im1.png"
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(4)
        p_logo.paragraph_format.space_after = Pt(16)
        p_logo.add_run().add_picture(logo_path, width=Inches(1.8))

    add_p(doc, "BÁO CÁO TIẾN ĐỘ TUẦN 9", size_pt=15, bold=True, color_rgb=(32, 180, 134), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=3)
    add_p(doc, "(31/10/2026 – 06/11/2026)", size_pt=11.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=14)

    add_p(doc, "TIỂU LUẬN CHUYÊN NGÀNH", size_pt=13, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)
    add_p(doc, "THIẾT KẾ VÀ XÂY DỰNG HỆ THỐNG", size_pt=14, bold=True, color_rgb=(16, 26, 44), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=3)
    add_p(doc, "QUẢN LÝ HỌC TẬP TRỰC TUYẾN EDUALTO", size_pt=14, bold=True, color_rgb=(16, 26, 44), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=3)
    add_p(doc, "(EDUALTO - ONLINE LEARNING MANAGEMENT SYSTEM)", size_pt=11, bold=True, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=20)

    # Info table on cover
    info_table = doc.add_table(rows=5, cols=2)
    info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    info_table.autofit = False
    col_widths = [Inches(2.5), Inches(3.3)]
    for row in info_table.rows:
        for i, w in enumerate(col_widths):
            row.cells[i].width = w

    items = [
        ("GVHD:", "PGS.TS. Hoàng Văn Dũng"),
        ("Thực hiện:", "Nhóm sinh viên thực hiện đề tài"),
        ("Sinh viên 1: Phạm Văn Hậu", "MSSV: 23110098"),
        ("Sinh viên 2: Nguyễn Nhật Thiên", "MSSV: 23110153"),
        ("Sinh viên 3: Trương Công Anh", "MSSV: 23110075")
    ]
    for idx, (c1, c2) in enumerate(items):
        cell1, cell2 = info_table.cell(idx, 0), info_table.cell(idx, 1)
        p1 = cell1.paragraphs[0]
        p1.paragraph_format.space_before = Pt(2)
        p1.paragraph_format.space_after = Pt(2)
        r1 = p1.add_run(c1)
        format_run(r1, size_pt=11, bold=(idx < 2), color_rgb=(16, 26, 44))
        
        p2 = cell2.paragraphs[0]
        p2.paragraph_format.space_before = Pt(2)
        p2.paragraph_format.space_after = Pt(2)
        r2 = p2.add_run(c2)
        format_run(r2, size_pt=11, bold=(idx == 0 or idx >= 2), color_rgb=(16, 26, 44))

    add_p(doc, "\nTP. Hồ Chí Minh, Năm 2026", size_pt=11.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=16, space_after=0)

    # ==========================================
    # PAGE 2: NHIỆM VỤ TIỂU LUẬN CHUYÊN NGÀNH
    # ==========================================
    doc.add_page_break()
    add_p(doc, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", size_pt=11.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=1)
    add_p(doc, "Độc lập – Tự do – Hạnh phúc", size_pt=11.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=1)
    add_p(doc, "----***----", size_pt=10.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)
    add_p(doc, "Tp. Hồ Chí Minh, ngày 06 tháng 11 năm 2026", size_pt=10.5, italic=True, align=WD_ALIGN_PARAGRAPH.RIGHT, space_after=10)

    add_p(doc, "NHIỆM VỤ TIỂU LUẬN CHUYÊN NGÀNH", size_pt=13, bold=True, color_rgb=(16, 26, 44), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10)

    add_p(doc, "1. Họ và tên sinh viên thực hiện:", size_pt=11, bold=True, space_after=2)
    add_bullet(doc, "Phạm Văn Hậu        MSSV: 23110098", bold_prefix="- Sinh viên 1: ", space_after=1.5)
    add_bullet(doc, "Nguyễn Nhật Thiên   MSSV: 23110153", bold_prefix="- Sinh viên 2: ", space_after=1.5)
    add_bullet(doc, "Trương Công Anh     MSSV: 23110075", bold_prefix="- Sinh viên 3: ", space_after=4)

    add_p(doc, "2. Ngành đào tạo: ", size_pt=11, bold=True, space_before=2, space_after=2).add_run("Công nghệ Thông tin")
    add_p(doc, "3. Tên đề tài: ", size_pt=11, bold=True, space_before=2, space_after=2).add_run("Thiết kế và xây dựng hệ thống quản lý học tập trực tuyến EduAlto")
    add_p(doc, "4. Giảng viên hướng dẫn: ", size_pt=11, bold=True, space_before=2, space_after=6).add_run("PGS.TS. Hoàng Văn Dũng")

    add_p(doc, "5. Nhiệm vụ của đề tài:", size_pt=11, bold=True, space_before=4, space_after=3)
    add_p(doc, "Xây dựng nền tảng Web học tập trực tuyến EduAlto kết hợp hài hòa giữa trải nghiệm Marketplace hiện đại và quản lý học tập chuyên sâu LMS, bao gồm các phân hệ chức năng chính:", 
          size_pt=10.5, space_after=4)

    add_p(doc, "a) Phía Người học (Student):", size_pt=10.5, bold=True, space_before=3, space_after=1.5)
    add_bullet(doc, "Đăng ký tài khoản, xác thực mã OTP qua email, đăng nhập và bảo mật thông tin cá nhân.")
    add_bullet(doc, "Khám phá, tìm kiếm và lọc khóa học theo danh mục, từ khóa, trình độ và giá cả.")
    add_bullet(doc, "Xem chi tiết khóa học, đề cương bài học, thông tin giảng viên và đánh giá học viên.")
    add_bullet(doc, "Quản lý giỏ hàng, thực hiện quy trình đăng ký ghi danh khóa học.")
    add_bullet(doc, "Tham gia học tập đa phương tiện (video bài giảng, tài liệu), đánh dấu hoàn thành và ghi chú.")
    add_bullet(doc, "Thực hiện bài kiểm tra trắc nghiệm (Quiz) và nộp bài tập tự luận (Assignment).")
    add_bullet(doc, "Theo dõi tiến độ học tập trực quan và nhận chứng chỉ hoàn thành khóa học điện tử có tem vector bảo mật và mã QR xác thực.")
    add_bullet(doc, "Tham gia trao đổi thảo luận, hỏi đáp bài học (Q&A Discussions) gắn mốc thời gian video, nhận thông báo đẩy thời gian thực qua WebSocket.")

    add_p(doc, "b) Phía Giảng viên (Instructor / Teacher / Mentor):", size_pt=10.5, bold=True, space_before=4, space_after=1.5)
    add_bullet(doc, "Quản lý hồ sơ chuyên môn, tiểu sử, kinh nghiệm và kỹ năng sư phạm.")
    add_bullet(doc, "Xây dựng và số hóa chương trình đào tạo với công cụ trực quan (Curriculum Builder).")
    add_bullet(doc, "Tạo và quản lý các học phần (Sections), bài học (Lessons), bài kiểm tra (Quiz) và bài tập (Assignment).")
    add_bullet(doc, "Theo dõi danh sách học viên ghi danh, tiến độ học tập và kết quả của từng học viên.")
    add_bullet(doc, "Chấm điểm bài tập tự luận, phản hồi học viên và nhận thông báo tức thời khi có học viên ghi danh mới hoặc đặt câu hỏi bài học.")
    add_bullet(doc, "Giải đáp thắc mắc của học viên trực tiếp trên bài học với huy hiệu Giảng viên phụ trách.")

    add_p(doc, "c) Phía Quản trị viên (Administrator):", size_pt=10.5, bold=True, space_before=4, space_after=1.5)
    add_bullet(doc, "Quản lý toàn bộ tài khoản người dùng, phân quyền truy cập động theo vai trò (Dynamic RBAC).")
    add_bullet(doc, "Quản trị danh mục khóa học, lĩnh vực chuyên ngành và từ khóa hệ thống.")
    add_bullet(doc, "Kiểm duyệt chất lượng nội dung khóa học trước khi cho phép xuất bản công khai.")
    add_bullet(doc, "Điều hành hệ thống thảo luận hỏi đáp toàn sàn và theo dõi số liệu thống kê vận hành thời gian thực.")

    add_p(doc, "d) Phía Hệ thống tự động (System):", size_pt=10.5, bold=True, space_before=4, space_after=1.5)
    add_bullet(doc, "Tự động sinh mã OTP xác minh email có thời hạn và giới hạn số lần thử.")
    add_bullet(doc, "Tự động tính toán tiến độ học tập, chấm điểm bài kiểm tra trắc nghiệm (Quiz).")
    add_bullet(doc, "Tự động cấp chứng chỉ hoàn thành điện tử với cơ chế khóa bi quan chống trùng lặp dữ liệu (SELECT ... FOR UPDATE).")
    add_bullet(doc, "Tự động kết xuất file PDF chứng chỉ khổ A4 ngang với tem bảo mật vector đa tầng, viền vi chữ chống photocopy giả mạo, mã băm SHA-256 chống sửa đổi và mã QR xác thực tức thì.")
    add_bullet(doc, "Tự động phân phối thông báo đẩy qua hạ tầng WebSocket STOMP Broker đích danh đến từng người dùng.")

    # ==========================================
    # PAGE 3: PHIẾU NHẬN XÉT GVHD
    # ==========================================
    doc.add_page_break()
    add_p(doc, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", size_pt=11.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=1)
    add_p(doc, "Độc lập – Tự do – Hạnh phúc", size_pt=11.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=1)
    add_p(doc, "----***----", size_pt=10.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)
    add_p(doc, "Tp. Hồ Chí Minh, ngày 06 tháng 11 năm 2026", size_pt=10.5, italic=True, align=WD_ALIGN_PARAGRAPH.RIGHT, space_after=10)

    add_p(doc, "NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN", size_pt=13, bold=True, color_rgb=(16, 26, 44), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10)
    add_p(doc, "Họ và tên sinh viên thực hiện:", size_pt=11, bold=True, space_after=2)
    add_bullet(doc, "Phạm Văn Hậu        MSSV: 23110098", bold_prefix="- Sinh viên 1: ", space_after=1.5)
    add_bullet(doc, "Nguyễn Nhật Thiên   MSSV: 23110153", bold_prefix="- Sinh viên 2: ", space_after=1.5)
    add_bullet(doc, "Trương Công Anh     MSSV: 23110075", bold_prefix="- Sinh viên 3: ", space_after=3)
    add_p(doc, "Ngành: ", size_pt=11, bold=True, space_after=2).add_run("Công nghệ Thông tin")
    add_p(doc, "Tên đề tài: ", size_pt=11, bold=True, space_after=2).add_run("Thiết kế và xây dựng hệ thống quản lý học tập trực tuyến EduAlto")
    add_p(doc, "Họ và tên Giảng viên hướng dẫn: ", size_pt=11, bold=True, space_after=8).add_run("PGS.TS. Hoàng Văn Dũng")

    add_p(doc, "NHẬN XÉT", size_pt=11.5, bold=True, space_after=4)
    add_p(doc, "1. Về nội dung đề tài và khối lượng công việc thực hiện:", size_pt=11, bold=True, space_after=1)
    add_p(doc, "………………………………………………………………………………………………………………………………………………\n………………………………………………………………………………………………………………………………………………", size_pt=11, space_after=6)
    add_p(doc, "2. Ưu điểm:", size_pt=11, bold=True, space_after=1)
    add_p(doc, "………………………………………………………………………………………………………………………………………………\n………………………………………………………………………………………………………………………………………………", size_pt=11, space_after=6)
    add_p(doc, "3. Khuyết điểm và các điểm cần hoàn thiện:", size_pt=11, bold=True, space_after=1)
    add_p(doc, "………………………………………………………………………………………………………………………………………………\n………………………………………………………………………………………………………………………………………………", size_pt=11, space_after=6)
    add_p(doc, "4. Đề nghị cho bảo vệ hay không: ………………………………………………………………………………………………", size_pt=11, bold=True, space_after=3)
    add_p(doc, "5. Đánh giá loại: ……………………………………………………………………………………………………………………", size_pt=11, bold=True, space_after=3)
    add_p(doc, "6. Điểm: ………………………………………………………………………………………………………………………………", size_pt=11, bold=True, space_after=12)

    add_p(doc, "Tp. Hồ Chí Minh, ngày … tháng … năm 2026\nGiảng viên hướng dẫn\n(Ký và ghi rõ họ tên)", 
          size_pt=11, bold=True, align=WD_ALIGN_PARAGRAPH.RIGHT, space_before=6)

    # ==========================================
    # PAGE 4: PHIẾU NHẬN XÉT GVPB
    # ==========================================
    doc.add_page_break()
    add_p(doc, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", size_pt=11.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=1)
    add_p(doc, "Độc lập – Tự do – Hạnh phúc", size_pt=11.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=1)
    add_p(doc, "----***----", size_pt=10.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)
    add_p(doc, "Tp. Hồ Chí Minh, ngày 06 tháng 11 năm 2026", size_pt=10.5, italic=True, align=WD_ALIGN_PARAGRAPH.RIGHT, space_after=10)

    add_p(doc, "NHẬN XÉT CỦA GIẢNG VIÊN PHẢN BIỆN", size_pt=13, bold=True, color_rgb=(16, 26, 44), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10)
    add_p(doc, "Họ và tên sinh viên thực hiện:", size_pt=11, bold=True, space_after=2)
    add_bullet(doc, "Phạm Văn Hậu        MSSV: 23110098", bold_prefix="- Sinh viên 1: ", space_after=1.5)
    add_bullet(doc, "Nguyễn Nhật Thiên   MSSV: 23110153", bold_prefix="- Sinh viên 2: ", space_after=1.5)
    add_bullet(doc, "Trương Công Anh     MSSV: 23110075", bold_prefix="- Sinh viên 3: ", space_after=3)
    add_p(doc, "Ngành: ", size_pt=11, bold=True, space_after=2).add_run("Công nghệ Thông tin")
    add_p(doc, "Tên đề tài: ", size_pt=11, bold=True, space_after=2).add_run("Thiết kế và xây dựng hệ thống quản lý học tập trực tuyến EduAlto")
    add_p(doc, "Họ và tên Giảng viên phản biện: ", size_pt=11, bold=True, space_after=8).add_run("....................................................................")

    add_p(doc, "NHẬN XÉT", size_pt=11.5, bold=True, space_after=4)
    add_p(doc, "1. Về nội dung đề tài và khối lượng công việc thực hiện:", size_pt=11, bold=True, space_after=1)
    add_p(doc, "………………………………………………………………………………………………………………………………………………\n………………………………………………………………………………………………………………………………………………", size_pt=11, space_after=6)
    add_p(doc, "2. Ưu điểm:", size_pt=11, bold=True, space_after=1)
    add_p(doc, "………………………………………………………………………………………………………………………………………………\n………………………………………………………………………………………………………………………………………………", size_pt=11, space_after=6)
    add_p(doc, "3. Khuyết điểm và các điểm cần hoàn thiện:", size_pt=11, bold=True, space_after=1)
    add_p(doc, "………………………………………………………………………………………………………………………………………………\n………………………………………………………………………………………………………………………………………………", size_pt=11, space_after=6)
    add_p(doc, "4. Đề nghị cho bảo vệ hay không: ………………………………………………………………………………………………", size_pt=11, bold=True, space_after=3)
    add_p(doc, "5. Đánh giá loại: ……………………………………………………………………………………………………………………", size_pt=11, bold=True, space_after=3)
    add_p(doc, "6. Điểm: ………………………………………………………………………………………………………………………………", size_pt=11, bold=True, space_after=12)

    add_p(doc, "Tp. Hồ Chí Minh, ngày … tháng … năm 2026\nGiảng viên phản biện\n(Ký và ghi rõ họ tên)", 
          size_pt=11, bold=True, align=WD_ALIGN_PARAGRAPH.RIGHT, space_before=6)

    # ==========================================
    # PAGE 5: BẢNG PHÂN CHIA CÔNG VIỆC TUẦN 9
    # ==========================================
    doc.add_page_break()
    add_p(doc, "BẢNG PHÂN CHIA CÔNG VIỆC VÀ TỶ LỆ HOÀN THÀNH (TUẦN 9)", size_pt=13, bold=True, 
          color_rgb=(16, 26, 44), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10)

    tasks_table = doc.add_table(rows=4, cols=6)
    tasks_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tasks_table)
    
    headers = ["STT", "Họ và tên", "MSSV", "Nhiệm vụ phân công cụ thể trong Tuần 9", "Kết quả thực hiện", "Tỷ lệ"]
    col_w = [Inches(0.4), Inches(1.15), Inches(0.85), Inches(2.55), Inches(1.15), Inches(0.6)]
    
    hdr_cells = tasks_table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        hdr_cells[i].width = col_w[i]
        set_cell_background(hdr_cells[i], "20B486")
        set_cell_margins(hdr_cells[i], top=80, bottom=80, left=60, right=60)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        format_run(p.runs[0], size_pt=10, bold=True, color_rgb=(255, 255, 255))

    tasks_data = [
        ("1", "Phạm Văn Hậu\n(Nhóm trưởng)", "23110098", 
         "• Thiết kế kiến trúc WebSocket STOMP Broker và luồng đẩy thông báo thời gian thực.\n• Cấu hình Spring Security: Xác thực JWT trong Upgrade Handshake /ws và frame STOMP CONNECT.\n• Phát triển RealtimeNotificationService, RealtimeNotificationController.\n• Nâng cấp CertificatePdfGenerator: Tem vector hoa cúc 36 cánh mạ vàng kim (#D4AF37), viền vi chữ Microtext 4.2pt, mã băm SHA-256 chống sửa đổi.\n• Tối ưu hóa khóa bi quan (SELECT ... FOR UPDATE) chống cấp trùng lặp.",
         "Hoàn thiện 100% backend WebSocket, bảo mật PDFBox và hạ tầng thông báo đẩy.", "100%"),
        ("2", "Nguyễn Nhật Thiên", "23110153",
         "• Phát triển STOMP WebSocket Client thuần (realtime-notification-client.ts) với cơ chế Heartbeat và Exponential Backoff Reconnect.\n• Xây dựng hook useRealtimeNotifications và component StudentAnnouncementBell với badge 'Trực tiếp'.\n• Xây dựng giao diện Hỏi & Đáp bài học (learning-lesson-discussions.tsx) tích hợp cơ chế nhảy mốc thời gian video bài học.\n• Hoàn thiện Cổng xác thực chứng chỉ điện tử công khai (verify-certificate-page.tsx) tối ưu SSR 0ms loading, Web Share API và CSS in khổ A4.",
         "Hoàn thiện 100% giao diện học tập, chuông thông báo và trang xác thực văn bằng.", "100%"),
        ("3", "Trương Công Anh", "23110075",
         "• Thiết kế CSDL Flyway migration V32 (discussions) & V33 (notifications).\n• Cấu hình ma trận phân quyền RBAC cho các chức năng thông báo đẩy và điều hành thảo luận.\n• Xây dựng trọn bộ kiểm thử tự động frontend: Thảo luận bài học (4/4 passed), Chuông WebSocket (3/3 passed), Xác thực chứng chỉ (3/3 passed).\n• Viết unit test cho CertificatePdfGeneratorTest.java trên Backend.\n• Xây dựng tài liệu kỹ thuật, kịch bản kiểm thử tích hợp và hướng dẫn nghiệm thu 3 kịch bản thực tế.",
         "Hoàn thành 100% migration CSDL, bộ kiểm thử tự động và tài liệu nghiệm thu.", "100%")
    ]

    for row_idx, data in enumerate(tasks_data):
        row_cells = tasks_table.rows[row_idx + 1].cells
        bg_col = "FFFFFF" if row_idx % 2 == 0 else "F9FBFB"
        for col_idx, text in enumerate(data):
            row_cells[col_idx].text = text
            row_cells[col_idx].width = col_w[col_idx]
            set_cell_background(row_cells[col_idx], bg_col)
            set_cell_margins(row_cells[col_idx], top=70, bottom=70, left=60, right=60)
            p = row_cells[col_idx].paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            is_center = col_idx in (0, 2, 5)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if is_center else WD_ALIGN_PARAGRAPH.LEFT
            format_run(p.runs[0], size_pt=9, bold=(col_idx == 5 or col_idx == 1), color_rgb=(16, 26, 44))

    # ==========================================
    # PAGE 6: LỜI CẢM ƠN
    # ==========================================
    doc.add_page_break()
    add_p(doc, "LỜI CẢM ƠN", size_pt=13, bold=True, color_rgb=(16, 26, 44), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12)
    add_p(doc, "Để hoàn thành bài báo cáo tiến độ Tiểu luận Chuyên ngành Tuần 9 này, nhóm chúng em xin bày tỏ lòng biết ơn sâu sắc và chân thành nhất đến quý thầy cô trường Đại học Sư phạm Kỹ thuật TP. Hồ Chí Minh, đặc biệt là các thầy cô tại Khoa Đào tạo Chất lượng cao và Khoa Công nghệ Thông tin, những người đã luôn tận tâm truyền đạt những nền tảng tri thức quý báu và rèn luyện tư duy khoa học cho chúng em trong suốt quá trình học tập.",
          size_pt=11, space_after=8, line_spacing=1.2)
    add_p(doc, "Đặc biệt, nhóm chúng em xin gửi lời cảm ơn chân thành và sâu sắc nhất đến thầy PGS.TS. Hoàng Văn Dũng, người đã luôn định hướng phương pháp nghiên cứu, tận tình hướng dẫn, góp ý chuyên môn sâu sắc và tạo mọi điều kiện thuận lợi nhất để nhóm có thể tiếp cận, phân tích và triển khai đề tài “Thiết kế và xây dựng hệ thống quản lý học tập trực tuyến EduAlto” một cách bài bản, đúng quy chuẩn học thuật.",
          size_pt=11, space_after=8, line_spacing=1.2)
    add_p(doc, "Mặc dù nhóm đã nỗ lực hết mình với tinh thần nghiêm túc và cầu thị, song do thời gian và kiến thức thực tiễn còn nhiều hạn chế, bài báo cáo và sản phẩm khó tránh khỏi những thiếu sót nhất định. Nhóm chúng em rất mong nhận được những lời nhận xét, góp ý và chỉ dẫn quý báu từ thầy để đề tài được hoàn thiện tốt hơn trong các giai đoạn phát triển tiếp theo.",
          size_pt=11, space_after=12, line_spacing=1.2)
    add_p(doc, "Kính chúc thầy luôn dồi dào sức khỏe, hạnh phúc và gặt hái được nhiều thành công hơn nữa trong sự nghiệp giáo dục cao quý!\n\nTp. Hồ Chí Minh, ngày 06 tháng 11 năm 2026",
          size_pt=11, italic=True, align=WD_ALIGN_PARAGRAPH.RIGHT, space_before=10)

    # ==========================================
    # SECTION I: THIẾT KẾ GIẢI PHÁP HẠ TẦNG
    # ==========================================
    doc.add_page_break()
    add_h1(doc, "I. THIẾT KẾ GIẢI PHÁP HẠ TẦNG HỆ THỐNG")
    add_h2(doc, "1.1. Sơ đồ kiến trúc triển khai tổng thể EduAlto")
    add_p(doc, "Sơ đồ dưới đây thể hiện toàn cảnh giải pháp kiến trúc triển khai thực tế của hệ thống EduAlto trên nền tảng Cloud (AWS, Vercel, Cloudflare R2), làm rõ sự phân tách giữa các môi trường mạng công khai và mạng riêng tư, luồng tương tác người dùng, giải pháp lưu trữ video tải nặng và cơ chế giám sát vận hành:",
          size_pt=11, space_after=6)

    arch_img = "docs/EduAlto_Architecture.png"
    if not os.path.exists(arch_img):
        arch_img = "report_assets/page_8_13_Im14.png"
    add_figure(doc, arch_img, "Hình 1: Sơ đồ Thiết kế Giải pháp Kiến trúc Triển khai Hệ thống EduAlto", width=Inches(5.6))

    add_h2(doc, "1.2. Chi tiết các phân tầng trong giải pháp Decoupled Multi-tier")
    add_p(doc, "Hệ thống EduAlto áp dụng kiến trúc phân tầng độc lập (Decoupled Multi-tier Architecture) nhằm đảm bảo khả năng chịu tải, tính sẵn sàng cao (High Availability) và bảo mật dữ liệu tuyệt đối:",
          size_pt=11, space_after=5)

    tiers_table = doc.add_table(rows=7, cols=3)
    tiers_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tiers_table)
    t_widths = [Inches(1.8), Inches(1.8), Inches(3.0)]
    t_headers = ["Phân tầng giải pháp", "Công nghệ / Dịch vụ", "Nhiệm vụ & Cơ chế vận hành"]
    
    t_hdr_cells = tiers_table.rows[0].cells
    for i, h in enumerate(t_headers):
        t_hdr_cells[i].text = h
        t_hdr_cells[i].width = t_widths[i]
        set_cell_background(t_hdr_cells[i], "20B486")
        set_cell_margins(t_hdr_cells[i], top=80, bottom=80, left=70, right=70)
        p = t_hdr_cells[i].paragraphs[0]
        format_run(p.runs[0], size_pt=10, bold=True, color_rgb=(255, 255, 255))

    tiers_data = [
        ("1. Tầng Trình duyệt & Frontend (Client Tier)", "Next.js 16 (App Router), React, Vercel CDN Edge",
         "Giao diện Web tương thích đa thiết bị (Desktop/Mobile). Phục vụ nội dung tĩnh và render tại Edge, giao tiếp với backend qua HTTPS TLS có bảo mật CORS."),
        ("2. Tầng API Gateway & Reverse Proxy", "Caddy Web Server, AWS Lightsail Firewall",
         "Cổng tiếp nhận lưu lượng duy nhất của backend, tự động quản lý chứng chỉ SSL Let's Encrypt, firewall chỉ mở cổng 443 và 80, proxy nội bộ đến container API."),
        ("3. Tầng Dịch vụ Backend (Application Tier)", "Spring Boot 3, Java 25 LTS, Docker Compose",
         "Kiến trúc Modular Monolith tổ chức phân rã theo miền nghiệp vụ: Auth, User, Course, Learning, Quiz, Certificate, Admin, Discussion, Notification. Đóng gói chuẩn Docker."),
        ("4. Tầng Bộ nhớ đệm & Phiên (Cache Tier)", "Redis 7 (Private Network, Port 6379)",
         "Lưu trữ cache danh mục khóa học, phân quyền động RBAC và xác thực nhanh Refresh Token. Hoàn toàn cách ly trong mạng nội bộ Docker."),
        ("5. Tầng Cơ sở dữ liệu (Persistence Tier)", "Amazon RDS PostgreSQL 16 (Private VPC Subnet)",
         "Lưu trữ dữ liệu có cấu trúc chính xác (ACID). Nằm cô lập hoàn toàn trong mạng riêng tư (Private Subnet), không cấp quyền truy cập từ Internet công cộng."),
        ("6. Tầng Lưu trữ Tệp lớn (Object Storage Tier)", "Cloudflare R2 (S3-compatible API)",
         "Lưu trữ video bài giảng chất lượng cao và tài liệu khóa học. Sử dụng cơ chế Presigned URL giúp client tải trực tiếp không qua backend, tiết kiệm băng thông.")
    ]

    for row_idx, data in enumerate(tiers_data):
        row_cells = tiers_table.rows[row_idx + 1].cells
        bg_col = "FFFFFF" if row_idx % 2 == 0 else "F9FBFB"
        for col_idx, text in enumerate(data):
            row_cells[col_idx].text = text
            row_cells[col_idx].width = t_widths[col_idx]
            set_cell_background(row_cells[col_idx], bg_col)
            set_cell_margins(row_cells[col_idx], top=60, bottom=60, left=60, right=60)
            p = row_cells[col_idx].paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            format_run(p.runs[0], size_pt=9, bold=(col_idx == 0), color_rgb=(16, 26, 44))

    add_h2(doc, "1.3. Các luồng dữ liệu và mạng")
    add_p(doc, "Trên sơ đồ thiết kế giải pháp (Hình 1), các luồng tương tác và luồng truyền dữ liệu được đánh số thứ tự từ 1 đến 12, giải thích chi tiết như sau:", size_pt=11, space_after=3)
    add_bullet(doc, "Học viên và Giảng viên truy cập ứng dụng web EduAlto thông qua trình duyệt, tải các trang giao diện Next.js được tối ưu hóa và phân phối qua mạng Vercel CDN Edge bằng giao thức HTTPS.", bold_prefix="Luồng 1 (Web Traffic): ")
    add_bullet(doc, "Khi người dùng thực hiện các thao tác nghiệp vụ (đăng nhập, xem bài học, làm bài tập, thanh toán), trình duyệt gửi yêu cầu API kèm Access Token (hoặc Refresh Token HttpOnly Cookie) đến địa chỉ IP tĩnh của Caddy Reverse Proxy tại cổng 443.", bold_prefix="Luồng 2 (API Requests): ")
    add_bullet(doc, "Caddy thực hiện giải mã SSL/TLS và chuyển tiếp yêu cầu HTTP nội bộ (cổng 8080) đến container Spring Boot API. Cổng 8080 và 6379 không bao giờ mở công khai ra Internet bên ngoài.", bold_prefix="Luồng 3 (Internal Proxy): ")
    add_bullet(doc, "Backend Spring Boot kết nối an toàn có mã hóa TLS qua cổng PostgreSQL 5432 đến Amazon RDS Primary Endpoint nằm trong mạng riêng tư (Private Subnet VPC) thông qua cơ chế VPC Peering.", bold_prefix="Luồng 4 (Database Connection): ")
    add_bullet(doc, "Backend truy xuất và lưu trữ dữ liệu tạm thời (phiên làm việc, phân quyền RBAC, danh mục khóa học thường xuyên truy cập) vào Redis container qua cổng nội bộ 6379, giảm tải tối đa cho PostgreSQL.", bold_prefix="Luồng 5 (Distributed Caching): ")
    add_bullet(doc, "Khi người dùng có nhu cầu tải lên tài liệu học tập hoặc xem video bài giảng, Backend gọi S3-compatible API của Cloudflare R2 để sinh URL ký trước (Presigned URL) có thời hạn bảo mật nghiêm ngặt.", bold_prefix="Luồng 6 (Presigned URL Request): ")
    add_bullet(doc, "Trình duyệt của học viên dùng Presigned URL để tải lên hoặc xem luồng video chất lượng cao trực tiếp với dịch vụ Cloudflare R2 mà không đi qua máy chủ backend, loại bỏ hoàn toàn hiện tượng nghẽn băng thông server.", bold_prefix="Luồng 7 (Direct Object Streaming): ")
    add_bullet(doc, "Khi có commit mới đẩy lên nhánh main trên GitHub, GitHub Actions thực thi bộ kiểm tra tự động (Lint, Typecheck, Test). Sau khi kiểm thử thành công, nó gửi lệnh deploy qua GitHub Actions Self-hosted runner chạy trên máy chủ AWS Lightsail để cập nhật container Docker với thời gian gián đoạn bằng 0 (Zero-downtime).", bold_prefix="Luồng 8 & 9 (CI/CD Automated Deployment): ")
    add_bullet(doc, "Nhật ký ứng dụng (Application Logs) từ container Docker được đồng bộ liên tục về Amazon CloudWatch Logs để lưu trữ, phục vụ tra cứu và kiểm toán bảo mật.", bold_prefix="Luồng 10 (Observability Logs): ")
    add_bullet(doc, "Chỉ số vận hành (CPU, RAM, độ trễ API, dung lượng đĩa và số lượng kết nối RDS) được đẩy về CloudWatch Metrics. Khi có chỉ số vượt ngưỡng an toàn (ví dụ: lỗi 5xx tăng đột biến hoặc CPU > 85%), CloudWatch Alarm sẽ chuyển sang trạng thái cảnh báo (ALARM state).", bold_prefix="Luồng 11 (Metrics & Alarms): ")
    add_bullet(doc, "CloudWatch Alarm kích hoạt dịch vụ thông báo Amazon SNS, tự động gửi email cảnh báo chi tiết sự cố đến hòm thư của Đội ngũ Quản trị / Vận hành hệ thống (Ops/Admin) để xử lý kịp thời.", bold_prefix="Luồng 12 (Emergency Notification): ")

    add_h2(doc, "1.4. Các nguyên tắc thiết kế giải pháp cốt lõi")
    add_bullet(doc, "Cơ sở dữ liệu Amazon RDS PostgreSQL nằm hoàn toàn trong Private Subnet, không có Public IP, chỉ cho phép kết nối nội bộ từ IP riêng của máy chủ ứng dụng.", bold_prefix="Nguyên tắc Không phơi bày Cơ sở dữ liệu (Zero Public DB Exposure): ")
    add_bullet(doc, "Nội dung video và tài liệu học tập dung lượng lớn được giao cho Cloudflare R2 phân phối trực tiếp tới trình duyệt, giúp máy chủ backend duy trì tài nguyên phục vụ các tác vụ tính toán nghiệp vụ.", bold_prefix="Nguyên tắc Giảm tải Băng thông bằng Presigned URL: ")
    add_bullet(doc, "Sử dụng Redis làm bộ nhớ đệm phân tán giúp hệ thống chịu tải đột biến khi số lượng học viên trực tuyến tăng cao mà không làm quá tải cơ sở dữ liệu quan hệ.", bold_prefix="Nguyên tắc Đảm bảo Độ bền bỉ và Mở rộng với Redis Cache: ")
    add_bullet(doc, "Tự động hóa hoàn toàn quy trình kiểm thử, đóng gói và triển khai qua CI/CD kết hợp giám sát chủ động qua CloudWatch, đảm bảo hệ thống vận hành liên tục và ổn định.", bold_prefix="Nguyên tắc Triển khai và Giám sát Tự động (Automated DevOps): ")

    # ==========================================
    # SECTION II: CÔNG VIỆC THỰC HIỆN TUẦN 9
    # ==========================================
    doc.add_page_break()
    add_h1(doc, "II. CÔNG VIỆC ĐÃ THỰC HIỆN TRONG TUẦN 9")
    add_p(doc, "Trong Tuần 9 (31/10/2026 – 06/11/2026), dự án EduAlto đã tập trung vào việc nghiên cứu, phát triển chuyên sâu và hoàn thiện toàn diện 3 phân hệ công nghệ trọng tâm, khắc phục triệt để các tồn tại sơ sài của tuần trước:", 
          size_pt=11, space_after=6)

    add_h2(doc, "2.1. Phân hệ Cấp & Xác thực Chứng chỉ điện tử nâng cao (E-Certificate & QR Verification)")
    add_p(doc, "Dựa trên nền tảng cơ bản ở tuần trước, trong tuần này phân hệ Cấp & Xác thực chứng chỉ đã được nâng cấp toàn diện về cả thuật toán chống trùng lặp, bảo mật vector đa tầng, và cổng xác thực công khai tốc độ cao:",
          size_pt=11, space_after=3)

    add_bullet(doc, "Khi học viên hoàn thành 100% tất cả các bài học bắt buộc trong khóa học, hệ thống tự động sinh bản ghi chứng nhận có mã định danh duy nhất theo định dạng EA-<HEX_MÃ_DUY_NHẤT>. Để ngăn chặn triệt để hiện tượng Race Condition khi người dùng bấm nút hoàn thành nhiều lần đồng thời, CertificateService sử dụng cơ chế Khóa bi quan (Pessimistic Locking) với câu lệnh 'SELECT ... FOR UPDATE' khóa bản ghi ghi danh trong giao dịch database.",
               bold_prefix="Cơ chế tự động cấp và Khóa bi quan chống Race Condition: ")
    
    add_bullet(doc, "Tích hợp thư viện Apache PDFBox 3.0.8, kết xuất file PDF chuẩn khổ ngang A4 Landscape (841.89 x 595.28 points) với các công nghệ bảo mật cao cấp bậc nhất hiện nay:",
               bold_prefix="Sinh file PDF chứng chỉ chuyên nghiệp với Tem bảo mật đa tầng (CertificatePdfGenerator): ")
    add_bullet(doc, "Nhúng trực tiếp font Unicode TrueType tiếng Việt (Roboto-Regular.ttf, Roboto-Bold.ttf), hiển thị trọn vẹn 100% dấu thanh tiếng Việt mà không vỡ bố cục trên mọi hệ điều hành.", bold_prefix="  - Nhúng phông tiếng Việt chuẩn: ")
    add_bullet(doc, "Tem bảo mật hình hoa cúc 36 cánh răng cưa cách điệu (Scalloped Petals) mạ vàng kim (#D4AF37), dải ruy băng đôi đối xứng, vành tròn men ngọc #20B486 và chùm 5 ngôi sao vàng biểu trưng chất lượng xuất sắc.", bold_prefix="  - Tem bảo mật vector đa tầng (Security Seal): ")
    add_bullet(doc, "Dải vi chữ siêu nhỏ kích thước 4.2pt chạy dọc theo đường viền: 'EDUALTO SECURE CERTIFICATE • VERIFIED ON-CHAIN & IN-DATABASE'. Vi chữ rõ nét khi xem kỹ thuật số ở mức phóng đại lớn nhưng tự động bị nhòe mờ khi photocopy hoặc scan tài liệu giấy.", bold_prefix="  - Viền vi chữ bảo mật (Microtext Border): ")
    add_bullet(doc, "Các đường sóng hình sin vector đan xen tinh tế tại 4 góc nền chứng chỉ chống làm giả tài liệu.", bold_prefix="  - Hoa văn bảo mật sóng âm Guilloche: ")
    add_bullet(doc, "Tự động sinh chuỗi băm bảo mật SHA-256 từ thông tin học viên, mã văn bằng và ngày cấp, in trực tiếp lên chứng chỉ tại mục SEC-HASH nhằm bảo đảm tính toàn vẹn dữ liệu chống sửa đổi tệp.", bold_prefix="  - Mã băm toàn vẹn SHA-256: ")
    add_bullet(doc, "Tích hợp ZXing 3.5.3 sinh mã QR Code ma trận điểm rõ nét tại góc dưới của chứng chỉ, liên kết trực tiếp tới trang xác thực công khai.", bold_prefix="  - Mã ma trận điểm QR Code: ")

    add_bullet(doc, "Truy cập không cần đăng nhập tại /certificates/verify/{certificateNumber}. Tối ưu Server-Side Pre-fetch hiển thị tức thì (0ms loading) trên di động. Bố cục gồm huy hiệu xanh 'Chứng chỉ hợp lệ', 4 khối thẻ thông số (Học viên, Ngày cấp, Mã văn bằng, Giảng viên), tính năng tải PDF gốc, sao chép liên kết và chia sẻ tức thì qua Web Share API.",
               bold_prefix="Cổng xác thực chứng chỉ công khai (Public Verification Portal): ")

    add_bullet(doc, "Tự động nhận diện địa chỉ IP Wi-Fi nội bộ (http://192.168.1.35:3000) cho mã QR thay vì localhost, cho phép camera điện thoại hoặc ứng dụng Zalo quét mã QR mở được ngay trang xác thực trên trình duyệt di động.",
               bold_prefix="Tương thích thiết bị di động trên mạng nội bộ / LAN: ")

    add_figure(doc, "report_assets/page_13_14_Im15.png", "Hình 2: Sơ lược giao diện cấp chứng chỉ phía học viên (/learning/certificates/[courseId])", width=Inches(5.0))
    add_figure(doc, "report_assets/page_14_15_Im16.png", "Hình 3: Thông tin chứng chỉ đã xác thực khi quét QR code (/certificates/verify/{code})", width=Inches(5.0))
    add_figure(doc, "report_assets/diagram_sequence_certificate.png", "Hình 4: Sơ đồ tuần tự quy trình kiểm tra điều kiện và cấp phát chứng chỉ điện tử", width=Inches(5.2))

    add_callout(doc, "Thuật toán CertificatePdfGenerator kết hợp tem bảo mật vector hoa cúc 36 cánh mạ vàng (#D4AF37), viền vi chữ 4.2pt và mã băm SHA-256 mang lại chuẩn mực bảo mật cấp độ doanh nghiệp cho văn bằng điện tử EduAlto.", 
                title="ĐIỂM NHẤN CÔNG NGHỆ BẢO MẬT VĂN BẰNG:")

    add_h2(doc, "2.2. Phân hệ Thảo luận & Hỏi đáp bài học tương tác cao (Lesson Q&A Discussions - EDU-15 / EDU-49)")
    add_p(doc, "Nhằm nâng cao tính tương tác trực tiếp trong không gian học tập trực tuyến, nhóm đã thiết kế và triển khai trọn bộ hệ thống Thảo luận & Hỏi đáp bài học:",
          size_pt=11, space_after=3)

    add_bullet(doc, "Cho phép đính kèm thời điểm video (ví dụ: 01:45 hoặc 02:05) khi đặt câu hỏi thắc mắc trong bài học. Khi bấm vào mốc thời gian hiển thị trên câu hỏi hoặc bình luận, trình phát video bài giảng sẽ lập tức tự động tua nhảy phát lại đến đúng giây tương ứng, giúp người học và giảng viên nắm bắt ngay phân đoạn bài giảng đang thảo luận.",
               bold_prefix="Gắn mốc thời gian video (Video Timestamp Anchor & Jump): ")

    add_bullet(doc, "Hỗ trợ câu hỏi chủ đề và các bình luận phân cấp phản hồi lồng nhau (parent_comment_id). Tự động đối chiếu thông tin người phản hồi với Giảng viên khóa học để gán huy hiệu nổi bật màu xanh ngọc 'Giảng viên' (isCourseInstructor). Cung cấp bộ lọc câu hỏi có mốc video, tìm kiếm nội dung câu hỏi, và sắp xếp theo mới nhất / cũ nhất.",
               bold_prefix="Tương tác đa tầng & Bình luận lồng nhau (Threaded Discussions): ")

    add_bullet(doc, "Học viên có quyền chỉnh sửa/xóa thảo luận hoặc bình luận của chính mình. Giảng viên phụ trách khóa học và Admin có toàn quyền điều hành, ghim bài viết quan trọng hoặc kiểm duyệt nội dung vi phạm.",
               bold_prefix="Phân quyền và điều hành thảo luận: ")

    add_bullet(doc, "Khởi tạo bảng discussions và discussion_comments thông qua Flyway migration V32. Hỗ trợ đầy đủ các khóa ngoại, chỉ mục tìm kiếm tối ưu (Indexes trên lesson_id, user_id, discussion_id) và cơ chế xóa mềm an toàn (Soft Delete qua trường deleted_at).",
               bold_prefix="Thiết kế Cơ sở dữ liệu CSDL (Migration V32): ")

    add_figure(doc, "report_assets/diagram_sequence_discussion.png", "Hình 5: Sơ đồ tuần tự quy trình đăng câu hỏi, thêm bình luận và kích hoạt thông báo hỏi đáp", width=Inches(5.2))

    add_h2(doc, "2.3. Phân hệ WebSocket gửi thông báo tức thời (Real-time Push Notifications)")
    add_p(doc, "Để loại bỏ hoàn toàn việc người dùng phải tải lại trang (reload) khi có phản hồi mới, nhóm đã triển khai hạ tầng thông báo đẩy thời gian thực toàn diện:",
          size_pt=11, space_after=3)

    add_bullet(doc, "Kích hoạt STOMP Message Broker tại endpoint /ws với hỗ trợ SockJS fallback. Hỗ trợ xác thực hai tầng: query parameter ?token= trong HTTP upgrade handshake và header Authorization: Bearer trong frame CONNECT STOMP. Cấu hình tiền tố kênh /topic (broadcast), /queue (hàng đợi), và tiền tố cá nhân /user để chuyển tiếp tin nhắn đích danh người dùng thông qua Spring Security Principal (/user/queue/notifications).",
               bold_prefix="Hạ tầng WebSocket STOMP Broker & Security Principal: ")

    add_bullet(doc, "Khi Giảng viên (hoặc bạn học) phản hồi thắc mắc trong bài học, hệ thống đẩy ngay thông báo tới tác giả câu hỏi kèm đường dẫn quay lại bài học. Đồng thời, khi có học viên mới ghi danh thành công, hệ thống gửi thông báo đẩy tức thì cho Giảng viên phụ trách khóa học.",
               bold_prefix="Tự động kích hoạt thông báo đẩy theo nghiệp vụ: ")

    add_bullet(doc, "Bảng notifications lưu trữ lịch sử, loại thông báo (NotificationType: DISCUSSION_REPLY, NEW_ENROLLMENT...), trạng thái đã đọc (read_at), tiêu đề, nội dung và action_url. Migration V33 cấu hình phân quyền RBAC tường minh: VIEW_REALTIME_NOTIFICATIONS, MARK_REALTIME_NOTIFICATION_READ, MARK_ALL_REALTIME_NOTIFICATIONS_READ cho các vai trò.",
               bold_prefix="Bền vững hóa dữ liệu & Phân quyền RBAC (Migration V33): ")

    add_bullet(doc, "Xây dựng native WebSocket STOMP client thuần (realtime-notification-client.ts) không phụ thuộc thư viện nặng ngoài, tự động quản lý heartbeat ping/pong (10 giây/lần) và reconnect thông minh theo hàm mũ (Exponential Backoff). Hook useRealtimeNotifications.ts quản lý danh sách thông báo và số lượng chưa đọc.",
               bold_prefix="STOMP Client thuần & Hook React chuyên biệt: ")

    add_bullet(doc, "Tích hợp chuông thông báo trên thanh Header cho cả Học viên và Giảng viên, bổ sung badge màu xanh 'Trực tiếp' (hiệu ứng nhấp nháy xanh khi kết nối WebSocket đang hoạt động), đồng bộ số lượng chưa xem và nút 'Đánh dấu tất cả đã đọc'.",
               bold_prefix="Chuông thông báo trực tiếp (StudentAnnouncementBell): ")

    add_figure(doc, "report_assets/diagram_websocket_architecture.png", "Hình 6: Sơ đồ kiến trúc WebSocket STOMP và luồng truyền dữ liệu thông báo thời gian thực", width=Inches(5.2))

    add_h2(doc, "2.4. Hệ thống Phân quyền động theo vai trò (Dynamic RBAC) & Giao diện Quản trị")
    add_p(doc, "Hệ thống phân quyền động theo vai trò đã được hoàn thiện và tích hợp chặt chẽ với hạ tầng Redis Caching và giao diện Quản trị viên:", size_pt=11, space_after=3)

    add_bullet(doc, "Thiết kế và khởi tạo bảng danh mục quyền hạn (permissions) và bảng liên kết nhiều-nhiều vai trò – quyền hạn (role_permissions). Định nghĩa tường minh các nhóm quyền: quản lý người dùng, khóa học, doanh thu, phân quyền vai trò, thông báo đẩy và cấu hình hệ thống.",
               bold_prefix="Mô hình dữ liệu RBAC mở rộng (V31, V33): ")

    add_bullet(doc, "Cài đặt PermissionAuthorizationManager can thiệp vào chuỗi lọc Spring Security, kết hợp dịch vụ AdminRbacService và AdminRoleController. Quyền hạn động được lưu bộ nhớ đệm phân tán qua Redis, cho phép cập nhật ma trận phân quyền tức thì không cần khởi động lại máy chủ backend.",
               bold_prefix="Tầng kiểm soát ủy quyền động (Dynamic Authorization Layer): ")

    add_bullet(doc, "Giao diện quản trị trực quan (/admin/roles), cho phép cấp/thu hồi từng quyền hạn cụ thể cho từng vai trò trong hệ thống (ROLE_ADMIN, ROLE_INSTRUCTOR, ROLE_STUDENT), hiển thị bảng ma trận checkbox rõ ràng kèm trạng thái lưu tức thì.",
               bold_prefix="Giao diện Quản trị Ma trận Phân quyền: ")

    add_bullet(doc, "Cải tiến trang 403 Forbidden với hình ảnh linh vật hoạt hình tương tác (Animated Mascot), chỉ dẫn người dùng quay lại trang chủ hoặc đăng nhập bằng tài khoản có thẩm quyền.",
               bold_prefix="Hiện đại hóa trang thông báo từ chối truy cập (Unauthorized View): ")

    add_figure(doc, "report_assets/page_15_16_Im17.png", "Hình 7: Giao diện quản trị vai trò & phân quyền hệ thống (/admin/roles)", width=Inches(5.0))
    add_figure(doc, "report_assets/page_16_17_Im18.png", "Hình 8: Hộp thoại cấu hình ma trận phân quyền chi tiết cho vai trò Giảng viên", width=Inches(5.0))
    add_figure(doc, "report_assets/page_17_18_Im19.png", "Hình 9: Bộ linh vật nhận diện thương hiệu hoạt hình EduAlto Mascot", width=Inches(4.8))
    add_figure(doc, "report_assets/page_17_19_Im20.png", "Hình 10: Giao diện thông báo từ chối quyền truy cập (403 Forbidden) với Mascot", width=Inches(5.0))
    add_figure(doc, "report_assets/diagram_security_architecture.png", "Hình 11: Sơ đồ kiến trúc an ninh bảo mật RBAC, JWT và xác thực phân quyền", width=Inches(5.2))

    add_h2(doc, "2.5. Danh mục chi tiết các tệp tin triển khai trong Tuần 9")
    add_p(doc, "Bảng dưới đây tổng hợp các tệp tin mã nguồn và migration CSDL chính đã được xây dựng, cấu hình hoặc nâng cấp trong tuần 9:", size_pt=11, space_after=4)

    files_table = doc.add_table(rows=16, cols=3)
    files_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(files_table)
    f_widths = [Inches(1.8), Inches(3.2), Inches(1.6)]
    f_headers = ["Phân hệ / Tầng", "Tên tệp tin và Đường dẫn", "Vai trò và Trách nhiệm"]
    
    f_hdr_cells = files_table.rows[0].cells
    for i, h in enumerate(f_headers):
        f_hdr_cells[i].text = h
        f_hdr_cells[i].width = f_widths[i]
        set_cell_background(f_hdr_cells[i], "20B486")
        set_cell_margins(f_hdr_cells[i], top=70, bottom=70, left=60, right=60)
        p = f_hdr_cells[i].paragraphs[0]
        format_run(p.runs[0], size_pt=9.5, bold=True, color_rgb=(255, 255, 255))

    files_data = [
        ("Database Migration", "backend/.../V32__lesson_discussions_and_comments.sql", "Tạo bảng discussions & discussion_comments kèm FK và index."),
        ("Database Migration", "backend/.../V33__realtime_notifications.sql", "Tạo bảng notifications, gán quyền RBAC thông báo thời gian thực."),
        ("WebSocket Core", "backend/.../common/config/WebSocketConfig.java", "Cấu hình STOMP broker, SockJS, JWT ChannelInterceptor."),
        ("WebSocket Security", "backend/.../common/security/AuthenticatedUser.java", "Thêm Principal định danh User ID cho STOMP destination."),
        ("Security Filter", "backend/.../common/security/JwtAuthenticationFilter.java", "Hỗ trợ trích xuất token query param ?token= cho /ws handshake."),
        ("Certificate PDF", "backend/.../certificate/service/CertificatePdfGenerator.java", "Kết xuất PDF chuẩn A4, tem vector hoa cúc vàng, viền vi chữ 4.2pt, SHA-256."),
        ("Notification Domain", "backend/.../notification/domain/Notification.java", "Entity thông báo, enum NotificationType (phản hồi, ghi danh)."),
        ("Notification Service", "backend/.../notification/service/RealtimeNotificationService.java", "Xử lý lưu trữ và gửi STOMP push tới đích danh người dùng."),
        ("Discussion Service", "backend/.../discussion/service/DiscussionService.java", "Xử lý nghiệp vụ hỏi đáp, nhảy mốc video và gửi thông báo phản hồi."),
        ("Frontend WebSocket", "frontend/src/lib/realtime-notification-client.ts", "STOMP client thuần native, heartbeat ping/pong, exponential backoff."),
        ("Frontend Hook", "frontend/src/features/notification/use-realtime-notifications.ts", "Hook React quản lý danh sách thông báo, số unread, socket status."),
        ("Notification UI", "frontend/src/features/notification/student-announcement-bell.tsx", "Chuông thông báo có badge 'Trực tiếp', hỗ trợ học viên & giảng viên."),
        ("Discussion UI", "frontend/src/features/learning/learning-lesson-discussions.tsx", "Giao diện hỏi đáp bài học, tua phát lại video khi nhấp mốc thời gian."),
        ("Certificate UI", "frontend/src/features/certificate/verify-certificate-page.tsx", "Trang xác thực công khai qua mã QR, SSR 0ms loading, Web Share API."),
        ("Testing Suite", "frontend/.../student-announcement-bell.test.tsx", "Bộ test kiểm thử chuông thông báo trực tiếp (3/3 passed).")
    ]

    for row_idx, data in enumerate(files_data):
        row_cells = files_table.rows[row_idx + 1].cells
        bg_col = "FFFFFF" if row_idx % 2 == 0 else "F9FBFB"
        for col_idx, text in enumerate(data):
            row_cells[col_idx].text = text
            row_cells[col_idx].width = f_widths[col_idx]
            set_cell_background(row_cells[col_idx], bg_col)
            set_cell_margins(row_cells[col_idx], top=50, bottom=50, left=50, right=50)
            p = row_cells[col_idx].paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            format_run(p.runs[0], size_pt=8.5, bold=(col_idx == 0), color_rgb=(16, 26, 44))

    # ==========================================
    # SECTION III: KIỂM THỬ VÀ ĐẢM BẢO CHẤT LƯỢNG
    # ==========================================
    doc.add_page_break()
    add_h1(doc, "III. KIỂM THỬ VÀ ĐẢM BẢO CHẤT LƯỢNG (QA & QUALITY GATES)")
    add_p(doc, "Toàn bộ mã nguồn phát triển trong tuần 9 đã vượt qua quy trình kiểm tra nghiêm ngặt 6 bước trước khi nghiệm thu, đảm bảo 100% tuân thủ các chuẩn mực chất lượng và không phát sinh bất kỳ cảnh báo hoặc lỗi tiềm ẩn nào:",
          size_pt=11, space_after=6)

    qa_table = doc.add_table(rows=7, cols=4)
    qa_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(qa_table)
    q_widths = [Inches(0.5), Inches(2.3), Inches(2.3), Inches(1.5)]
    q_headers = ["STT", "Nội dung kiểm tra", "Công cụ / Lệnh thực hiện", "Kết quả đạt được"]
    
    q_hdr_cells = qa_table.rows[0].cells
    for i, h in enumerate(q_headers):
        q_hdr_cells[i].text = h
        q_hdr_cells[i].width = q_widths[i]
        set_cell_background(q_hdr_cells[i], "20B486")
        set_cell_margins(q_hdr_cells[i], top=80, bottom=80, left=60, right=60)
        p = q_hdr_cells[i].paragraphs[0]
        format_run(p.runs[0], size_pt=9.5, bold=True, color_rgb=(255, 255, 255))

    qa_data = [
        ("1", "Fast Lint (Kiểm tra lint siêu tốc)", "Oxlint (pnpm frontend:lint:fast)", "0 lỗi, 0 cảnh báo (244 files)"),
        ("2", "Detailed Lint (Kiểm tra lint chi tiết)", "ESLint 9 (pnpm frontend:lint)", "0 lỗi"),
        ("3", "Format Check (Kiểm tra định dạng)", "Oxfmt (pnpm frontend:fmt:check)", "100% đạt chuẩn (249 files)"),
        ("4", "Type Check (Kiểm tra kiểu dữ liệu)", "TypeScript (tsc --noEmit)", "0 lỗi kiểu dữ liệu"),
        ("5", "Frontend Unit & Component Tests", "Vitest (pnpm --dir frontend test)", "31/31 suites, 122/122 tests passed"),
        ("6", "Backend Compile & Unit Tests", "Maven Wrapper (./mvnw test-compile / test)", "BUILD SUCCESS, 15/15 tests passed")
    ]

    for row_idx, data in enumerate(qa_data):
        row_cells = qa_table.rows[row_idx + 1].cells
        bg_col = "FFFFFF" if row_idx % 2 == 0 else "F9FBFB"
        for col_idx, text in enumerate(data):
            row_cells[col_idx].text = text
            row_cells[col_idx].width = q_widths[col_idx]
            set_cell_background(row_cells[col_idx], bg_col)
            set_cell_margins(row_cells[col_idx], top=60, bottom=60, left=60, right=60)
            p = row_cells[col_idx].paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            is_center = col_idx in (0, 3)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if is_center else WD_ALIGN_PARAGRAPH.LEFT
            format_run(p.runs[0], size_pt=9, bold=(col_idx == 3 or col_idx == 0), color_rgb=(16, 26, 44))

    add_h2(doc, "3.2. Chi tiết các bài kiểm thử tự động chuyên biệt mới trong Tuần 9")
    add_bullet(doc, "Tệp kiểm thử: frontend/src/features/learning/learning-lesson-discussions.test.tsx. Kết quả: 4/4 passed (100%). Bao gồm: Render danh sách câu hỏi thảo luận, gửi câu hỏi mới có mốc video, tua video đến đúng giây khi bấm vào timestamp, và phản hồi bình luận.",
               bold_prefix="1. Kiểm thử Hỏi & Đáp bài học (Discussions Test): ")
    add_bullet(doc, "Tệp kiểm thử: frontend/src/features/notification/student-announcement-bell.test.tsx. Kết quả: 3/3 passed (100%). Bao gồm: Hiển thị badge số lượng chưa đọc, mở dialog hiển thị trạng thái kết nối trực tiếp, hiển thị thông báo đẩy, và thao tác đánh dấu tất cả đã đọc.",
               bold_prefix="2. Kiểm thử Chuông thông báo Real-time (WebSocket Bell Test): ")
    add_bullet(doc, "Tệp kiểm thử: frontend/src/features/certificate/verify-certificate-page.test.tsx. Kết quả: 3/3 passed (100%). Bao gồm: Render chi tiết chứng chỉ hợp lệ, hiển thị các nút tải PDF / chia sẻ, và xử lý trường hợp mã chứng chỉ không tồn tại.",
               bold_prefix="3. Kiểm thử Xác thực chứng chỉ điện tử (Verify Certificate Test): ")
    add_bullet(doc, "Tệp kiểm thử: backend/.../service/CertificatePdfGeneratorTest.java. Kết quả: Build Success. Đảm bảo kết xuất PDF hợp lệ với Apache PDFBox, nhúng font tiếng Việt, hoa văn Guilloche và mã băm SHA-256.",
               bold_prefix="4. Kiểm thử Sinh PDF chứng chỉ bảo mật (Backend PDFBox Test): ")

    # ==========================================
    # SECTION IV: HƯỚNG DẪN NGHIỆM THU TÍNH NĂNG
    # ==========================================
    doc.add_page_break()
    add_h1(doc, "IV. HƯỚNG DẪN VÀ KỊCH BẢN NGHIỆM THU TÍNH NĂNG THỰC TẾ")
    add_p(doc, "Để giúp quý thầy cô và hội đồng dễ dàng kiểm tra, nghiệm thu thực tế sản phẩm, nhóm đã chuẩn bị 4 kịch bản tương tác minh họa trực quan từng bước:",
          size_pt=11, space_after=6)

    add_h2(doc, "Kịch bản 1: Giảng viên phản hồi thắc mắc bài học của học viên (WebSocket Push Real-time)")
    add_bullet(doc, "Đăng nhập tài khoản học viên, vào bài học bất kỳ, chọn tab Hỏi đáp, bấm nút lấy mốc video hiện tại (ví dụ: 01:45) và đăng câu hỏi kèm nội dung thắc mắc.", bold_prefix="Bước 1 (Học viên): ")
    add_bullet(doc, "Đăng nhập tài khoản Giảng viên phụ trách khóa học đó trên một trình duyệt khác, mở câu hỏi của học viên và gửi câu trả lời giải đáp.", bold_prefix="Bước 2 (Giảng viên phụ trách): ")
    add_bullet(doc, "Không cần tải lại trang (No page reload) - Chuông thông báo trên Header lập tức xuất hiện chấm đỏ có số lượng chưa đọc. Bấm vào chuông: có badge màu xanh 'Trực tiếp' và dòng thông báo mới: 'Giảng viên đã giải đáp câu hỏi của bạn: [Tên câu hỏi]'. Bấm vào thông báo sẽ tự động chuyển đến đúng bài học và đánh dấu đã đọc.", bold_prefix="Bước 3 (Quan sát phía Học viên): ")

    add_h2(doc, "Kịch bản 2: Học viên mới đăng ký khóa học (WebSocket Push tới Giảng viên)")
    add_bullet(doc, "Đang mở trang web trên trình duyệt (ở bất kỳ trang nào).", bold_prefix="Bước 1 (Giảng viên): ")
    add_bullet(doc, "Học viên thực hiện thao tác ghi danh một khóa học do Giảng viên đó phụ trách.", bold_prefix="Bước 2 (Học viên): ")
    add_bullet(doc, "Chuông thông báo của Giảng viên lập tức nhận thông báo đẩy thời gian thực qua kênh /user/queue/notifications với nội dung: 'Học viên mới đăng ký khóa học: Học viên [Tên] vừa đăng ký khóa học [Tên khóa học]'.", bold_prefix="Bước 3 (Quan sát phía Giảng viên): ")

    add_h2(doc, "Kịch bản 3: Hỏi đáp gắn mốc video và trải nghiệm nhảy tua phát lại (Video Timestamp Jump)")
    add_bullet(doc, "Trong bài học có video bài giảng, kéo thanh tiến trình video đến một thời điểm bất kỳ (ví dụ: 02:15).", bold_prefix="Bước 1: ")
    add_bullet(doc, "Bấm vào nút đính kèm mốc video hiện tại và gửi thắc mắc lên hệ thống.", bold_prefix="Bước 2: ")
    add_bullet(doc, "Câu hỏi hiển thị huy hiệu thời gian 02:15. Khi bấm vào huy hiệu này ở bất kỳ đâu, trình phát video lập tức tua phát lại đúng giây thứ 135.", bold_prefix="Bước 3: ")

    add_h2(doc, "Kịch bản 4: Quét mã QR xác thực chứng chỉ trên thiết bị di động trong mạng nội bộ")
    add_bullet(doc, "Mở trang chứng chỉ khóa học đã hoàn thành hoặc mở file PDF chứng chỉ đã tải về trên máy tính.", bold_prefix="Bước 1: ")
    add_bullet(doc, "Dùng Camera điện thoại hoặc ứng dụng Zalo trên điện thoại (kết nối chung mạng Wi-Fi LAN) quét mã QR ma trận điểm in trên chứng chỉ.", bold_prefix="Bước 2: ")
    add_bullet(doc, "Trình duyệt điện thoại tự động mở trang xác minh tại http://192.168.1.35:3000/certificates/verify/{code} hiển thị tức thì (0ms loading), đầy đủ thông tin vinh danh học viên và cho phép tải file PDF gốc về điện thoại.", bold_prefix="Bước 3: ")

    # ==========================================
    # SECTION V: KẾT QUẢ ĐẠT ĐƯỢC & KẾ HOẠCH TUẦN 10
    # ==========================================
    doc.add_page_break()
    add_h1(doc, "V. KẾT QUẢ ĐẠT ĐƯỢC VÀ KẾ HOẠCH TUẦN 10")
    add_h2(doc, "5.1. Kết quả đạt được trong Tuần 9")
    add_p(doc, "Trong tuần 9, EduAlto đã có bước tiến đột phá, chuyển đổi từ một nền tảng học tập thông thường thành một hệ sinh thái học tập tương tác cao với độ bảo mật hoàn thiện:", size_pt=11, space_after=3)
    add_bullet(doc, "Khép kín chu trình học tập trực tuyến với khả năng thảo luận hỏi đáp ngay trên bài giảng gắn mốc thời gian video và cơ chế nhảy phát lại tiện lợi.", bold_prefix="Tương tác học tập trực tiếp: ")
    add_bullet(doc, "Hạ tầng WebSocket STOMP mang lại trải nghiệm thông báo tức thì không độ trễ cho cả Học viên và Giảng viên.", bold_prefix="Thông báo đẩy thời gian thực: ")
    add_bullet(doc, "Văn bằng điện tử đạt tiêu chuẩn bảo mật ngân hàng với tem vector đa tầng mạ vàng, dải vi chữ Microtext chống photocopy, mã băm SHA-256 và trang xác thực công khai siêu tốc.", bold_prefix="Chứng chỉ bảo mật chuyên nghiệp: ")
    add_bullet(doc, "Đạt 100% tỷ lệ vượt qua tất cả 6 bước trong bộ kiểm tra chất lượng tự động, mã nguồn sạch sẽ, không lỗi cú pháp hoặc cảnh báo kiểu dữ liệu.", bold_prefix="Chất lượng mã nguồn tuyệt đối: ")

    add_h2(doc, "5.2. Kế hoạch trọng tâm Tuần 10")
    add_bullet(doc, "Tích hợp mô hình Gemini AI hỗ trợ học viên giải đáp thắc mắc bài học thông minh, tóm tắt nội dung video và gợi ý bài tập rèn luyện cá nhân hóa.", bold_prefix="1. Trợ giảng thông minh AI Chatbot: ")
    add_bullet(doc, "Tối ưu hóa các cổng thanh toán tự động (SePay, VietQR, Stripe), quản lý lịch sử giao dịch và xuất hóa đơn điện tử cho học viên.", bold_prefix="2. Mở rộng Phân hệ Thanh toán thương mại điện tử: ")
    add_bullet(doc, "Sử dụng công cụ k6 để mô phỏng tải đồng thời 500+ học viên tham gia học tập, thảo luận và kết nối WebSocket, tối ưu hóa bộ nhớ đệm Redis và các câu truy vấn CSDL.", bold_prefix="3. Kiểm thử tải và Tối ưu hóa hiệu năng (Load Testing): ")

    # ==========================================
    # SECTION VI: TÀI LIỆU VÀ MÃ NGUỒN
    # ==========================================
    add_h1(doc, "VI. TÀI LIỆU VÀ MÃ NGUỒN")
    add_bullet(doc, "https://github.com/teehihi/edu-alto (nhánh main).", bold_prefix="Kho lưu trữ mã nguồn (Git Repository): ")
    add_bullet(doc, "Thuộc nhánh main commit f7ae4e5 (feat(discussion,notification,certificate): add realtime discussion, notifications and certificate verification), quy mô 54 files changed, 4,649 insertions(+), 433 deletions(-).", bold_prefix="Commit trọng tâm Tuần 9: ")
    add_bullet(doc, "Tệp tin TONG_KET_CONG_VIEC.md và BAO_CAO_TUAN_9.md trong kho mã nguồn mô tả chi tiết kiến trúc, danh mục API, hướng dẫn kiểm thử và quy trình quét QR chứng chỉ trên thiết bị di động.", bold_prefix="Tài liệu kỹ thuật bổ sung: ")

    output_docx = os.path.abspath("BaoCaoTuan9_TieuLuanChuyenNganh_EduAlto.docx")
    doc.save(output_docx)
    print(f"Document successfully created at: {output_docx} (Size: {os.path.getsize(output_docx)} bytes)")

    # Convert to PDF using Microsoft Word COM
    print("Converting DOCX to PDF using Microsoft Word COM...")
    try:
        import win32com.client
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0
        wdoc = word.Documents.Open(output_docx, ReadOnly=True)
        output_pdf = os.path.abspath("BaoCaoTuan9_TieuLuanChuyenNganh_EduAlto.pdf")
        wdoc.SaveAs2(output_pdf, FileFormat=17) # 17 = wdFormatPDF
        wdoc.Close()
        word.Quit()
        print(f"PDF successfully generated at: {output_pdf} (Size: {os.path.getsize(output_pdf)} bytes)")
    except Exception as e:
        print(f"Error during Word PDF conversion: {e}")

if __name__ == "__main__":
    build_report()
