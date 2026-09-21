from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "Bao_cao_bo_sung_MongoDB.docx"
DIAGRAM = ROOT / "database" / "so_do_mongo_logic.png"

COLLECTIONS = [
    ("VaiTro", "MaVaiTro", "Danh mục vai trò"),
    ("NhanVien", "MaNV", "Nhân viên"),
    ("KhachHang", "MaKH", "Khách hàng"),
    ("NhaCungCap", "MaNCC", "Nhà cung cấp"),
    ("LoaiHang", "MaLoai", "Loại hàng"),
    ("SanPham", "MaSP", "Sản phẩm"),
    ("DonDatHang", "MaDDH", "Đơn đặt hàng"),
    ("CT_DonDatHang", "MaDDH + MaSP", "Chi tiết đơn đặt hàng"),
    ("PhieuNhap", "MaPN", "Phiếu nhập"),
    ("CT_PhieuNhap", "MaPN + MaSP", "Chi tiết phiếu nhập"),
    ("DonHang", "MaDH", "Đơn hàng"),
    ("CT_DonHang", "MaDH + MaSP", "Chi tiết đơn hàng"),
    ("HoaDon", "MaHD", "Hóa đơn"),
    ("CT_HoaDon", "MaHD + MaSP", "Chi tiết hóa đơn"),
    ("ThanhToan", "MaTT", "Thanh toán"),
    ("PhieuXuat", "MaPX", "Phiếu xuất"),
    ("CT_PhieuXuat", "MaPX + MaSP", "Chi tiết phiếu xuất"),
    ("TonKho", "MaSP", "Tồn kho"),
    ("KiemKe", "MaKK", "Kiểm kê"),
    ("CT_KiemKe", "MaKK + MaSP", "Chi tiết kiểm kê"),
    ("PhieuTraHang", "MaPTH", "Phiếu trả hàng"),
    ("CT_PhieuTraHang", "MaPTH + MaSP", "Chi tiết trả hàng"),
    ("KhuyenMai", "MaKM", "Khuyến mãi"),
    ("CT_KhuyenMai", "MaKM + MaSP", "Chi tiết khuyến mãi"),
    ("CongNo", "MaCN", "Công nợ"),
]

RELATIONS = [
    ("SanPham", "MaLoai", "LoaiHang", "_id"),
    ("NhanVien", "MaVaiTro", "VaiTro", "MaVaiTro"),
    ("DonDatHang", "MaNCC", "NhaCungCap", "_id"),
    ("DonDatHang", "MaNV", "NhanVien", "_id"),
    ("CT_DonHang", "MaDH", "DonHang", "_id"),
    ("CT_DonHang", "MaSP", "SanPham", "_id"),
    ("HoaDon", "MaDH", "DonHang", "_id"),
    ("CT_HoaDon", "MaHD", "HoaDon", "_id"),
    ("CT_HoaDon", "MaSP", "SanPham", "_id"),
    ("ThanhToan", "MaHD", "HoaDon", "_id"),
    ("PhieuNhap", "MaDDH", "DonDatHang", "_id"),
    ("CT_PhieuNhap", "MaPN", "PhieuNhap", "_id"),
    ("CT_PhieuNhap", "MaSP", "SanPham", "_id"),
    ("PhieuXuat", "MaDH", "DonHang", "_id"),
    ("CT_PhieuXuat", "MaPX", "PhieuXuat", "_id"),
    ("CT_PhieuXuat", "MaSP", "SanPham", "_id"),
    ("TonKho", "MaSP", "SanPham", "_id"),
    ("KiemKe", "MaNV", "NhanVien", "_id"),
    ("CT_KiemKe", "MaKK", "KiemKe", "_id"),
    ("CT_KiemKe", "MaSP", "SanPham", "_id"),
    ("PhieuTraHang", "MaDH", "DonHang", "_id"),
    ("CT_PhieuTraHang", "MaPTH", "PhieuTraHang", "_id"),
    ("CT_PhieuTraHang", "MaSP", "SanPham", "_id"),
    ("CT_KhuyenMai", "MaKM", "KhuyenMai", "_id"),
    ("CT_KhuyenMai", "MaSP", "SanPham", "_id"),
    ("CongNo", "MaNCC", "NhaCungCap", "_id"),
]


def font(size, bold=False):
    candidates = ["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/tahoma.ttf"]
    if bold:
        candidates.insert(0, "C:/Windows/Fonts/arialbd.ttf")
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def make_diagram():
    image = Image.new("RGB", (1800, 1180), "white")
    draw = ImageDraw.Draw(image)
    title_font = font(34, True)
    box_title = font(22, True)
    box_text = font(17)
    draw.text((50, 28), "Sơ đồ dữ liệu logic MongoDB - 25 collection", fill="#17324d", font=title_font)
    draw.text((50, 75), "_id: khóa chính MongoDB | Ma...: mã unique | ObjectId: khóa ngoại logic", fill="#52606d", font=box_text)
    boxes = {
        "VaiTro": (70, 150), "NhanVien": (330, 150), "LoaiHang": (620, 150), "NhaCungCap": (900, 150),
        "SanPham": (620, 390), "KhachHang": (70, 390), "DonDatHang": (1020, 390),
        "DonHang": (70, 650), "PhieuNhap": (1020, 650), "HoaDon": (420, 650),
        "ThanhToan": (420, 900), "PhieuXuat": (1020, 900), "TonKho": (620, 650),
        "KiemKe": (1300, 650), "PhieuTraHang": (1300, 900), "KhuyenMai": (70, 900),
        "CongNo": (900, 900), "ChiTiet": (1450, 390),
    }
    sizes = {name: (230, 105) for name in boxes}
    sizes["ChiTiet"] = (270, 170)
    for name, (x, y) in boxes.items():
        w, h = sizes[name]
        draw.rounded_rectangle((x, y, x + w, y + h), radius=8, fill="#eef6fb", outline="#3178a6", width=3)
        draw.text((x + 14, y + 12), name, fill="#17324d", font=box_title)
        lines = ["_id: ObjectId (PK)"]
        if name == "ChiTiet":
            lines += ["MaDH + MaSP (unique)", "MaDH, MaSP: FK logic", "SoLuong, DonGia"]
        elif name in {"SanPham", "DonHang", "HoaDon", "PhieuNhap", "PhieuXuat", "KiemKe", "PhieuTraHang", "KhuyenMai", "DonDatHang"}:
            lines += ["Ma...: unique", "ObjectId: FK logic"]
        else:
            lines += ["Ma...: unique"]
        for index, line in enumerate(lines):
            draw.text((x + 14, y + 48 + index * 22), line, fill="#34495e", font=box_text)
    for child, child_field, parent, parent_field in RELATIONS:
        if child not in boxes or parent not in boxes:
            continue
        cx, cy = boxes[child]
        px, py = boxes[parent]
        cw, ch = sizes[child]
        pw, ph = sizes[parent]
        start = (cx + cw // 2, cy + ch // 2)
        end = (px + pw // 2, py + ph // 2)
        draw.line((start, end), fill="#9aa9b5", width=2)
    image.save(DIAGRAM)


def shade(cell, color):
    properties = cell._tc.get_or_add_tcPr()
    fill = OxmlElement("w:shd")
    fill.set(qn("w:fill"), color)
    properties.append(fill)


def set_cell_text(cell, text, bold=False):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    run = paragraph.add_run(str(text))
    run.bold = bold
    run.font.size = Pt(9)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def add_table(document, headers, rows, widths=None):
    table = document.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    for index, header in enumerate(headers):
        set_cell_text(table.rows[0].cells[index], header, True)
        shade(table.rows[0].cells[index], "1F4E78")
        for run in table.rows[0].cells[index].paragraphs[0].runs:
            run.font.color.rgb = RGBColor(255, 255, 255)
    for row in rows:
        cells = table.add_row().cells
        for index, value in enumerate(row):
            set_cell_text(cells[index], value)
    if widths:
        for row in table.rows:
            for index, width in enumerate(widths):
                row.cells[index].width = Inches(width)
    document.add_paragraph()
    return table


def add_code(document, text):
    paragraph = document.add_paragraph()
    paragraph.style = "No Spacing"
    run = paragraph.add_run(text)
    run.font.name = "Consolas"
    run.font.size = Pt(8)
    paragraph.paragraph_format.left_indent = Inches(0.25)
    paragraph.paragraph_format.space_after = Pt(6)


def main():
    make_diagram()
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.65)
    section.bottom_margin = Inches(0.65)
    section.left_margin = Inches(0.7)
    section.right_margin = Inches(0.7)
    styles = doc.styles
    styles["Normal"].font.name = "Arial"
    styles["Normal"].font.size = Pt(10.5)
    for style_name in ["Title", "Heading 1", "Heading 2"]:
        styles[style_name].font.name = "Arial"
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("BÁO CÁO BỔ SUNG\nMÔ HÌNH CƠ SỞ DỮ LIỆU MONGODB")
    run.bold = True
    run.font.size = Pt(18)
    run.font.color.rgb = RGBColor(31, 78, 121)
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.add_run("Hệ thống quản lý Cửa hàng Mẹ và Bé\nGiữ nguyên mô hình 25 bảng logic").italic = True
    doc.add_paragraph()

    doc.add_heading("1. Mục đích bổ sung", level=1)
    doc.add_paragraph("Tài liệu này bổ sung cách triển khai mô hình 25 bảng hiện có trên MongoDB. Các bảng trong sơ đồ được giữ nguyên về mặt nghiệp vụ, nhưng khi triển khai sẽ tương ứng với collection và document.")
    doc.add_paragraph("MongoDB sử dụng _id kiểu ObjectId làm khóa chính thật. Các trường Ma... là mã nghiệp vụ, được tạo unique index. Khóa ngoại SQL được chuyển thành khóa ngoại logic và được kiểm tra tại backend.")

    doc.add_heading("2. Quy ước khóa và ràng buộc", level=1)
    add_table(doc, ["Thành phần", "Cách thể hiện trong MongoDB", "Ý nghĩa"], [
        ("Khóa chính", "_id: ObjectId", "MongoDB tự tạo và bảo đảm duy nhất"),
        ("Mã nghiệp vụ", "MaSP, MaKH, MaDH... + unique index", "Không cho phép trùng mã"),
        ("Khóa ngoại", "ObjectId tham chiếu collection cha", "Kiểm tra tồn tại trước khi ghi"),
        ("Khóa ghép", "unique index, ví dụ MaDH + MaSP", "Không lặp sản phẩm trong cùng chứng từ"),
        ("NOT NULL / kiểu dữ liệu", "$jsonSchema và validation backend", "Kiểm tra dữ liệu đầu vào"),
        ("Xóa bản ghi cha", "Kiểm tra collection con trước khi xóa", "Mô phỏng ON DELETE RESTRICT"),
    ], [1.3, 2.6, 2.6])

    doc.add_heading("3. Danh sách 25 collection tương ứng 25 bảng", level=1)
    add_table(doc, ["STT", "Bảng logic / collection", "Khóa nghiệp vụ", "Mục đích"], [(i + 1, name, key, purpose) for i, (name, key, purpose) in enumerate(COLLECTIONS)], [0.45, 1.8, 1.3, 2.8])

    doc.add_heading("4. Sơ đồ dữ liệu logic", level=1)
    doc.add_paragraph("Sơ đồ dưới đây giữ các bảng nghiệp vụ đang có, đồng thời chú thích cách hiểu theo MongoDB.")
    doc.add_picture(str(DIAGRAM), width=Inches(6.7))
    doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph("Hình 1. Sơ đồ collection MongoDB và các quan hệ khóa ngoại logic.").alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_heading("5. Bảng ánh xạ khóa ngoại", level=1)
    add_table(doc, ["Collection con", "Trường tham chiếu", "Collection cha", "Trường được tham chiếu"], RELATIONS, [1.6, 1.5, 1.7, 1.7])

    doc.add_heading("6. Các unique index cần tạo", level=1)
    add_code(doc, '''db.SanPham.createIndex({ MaSP: 1 }, { unique: true });
db.KhachHang.createIndex({ MaKH: 1 }, { unique: true });
db.NhaCungCap.createIndex({ MaNCC: 1 }, { unique: true });
db.LoaiHang.createIndex({ MaLoai: 1 }, { unique: true });
db.DonHang.createIndex({ MaDH: 1 }, { unique: true });
db.HoaDon.createIndex({ MaHD: 1 }, { unique: true });
db.CT_DonHang.createIndex({ MaDH: 1, MaSP: 1 }, { unique: true });
db.CT_HoaDon.createIndex({ MaHD: 1, MaSP: 1 }, { unique: true });''')
    doc.add_paragraph("Các collection chi tiết còn lại áp dụng tương tự: CT_DonDatHang(MaDDH, MaSP), CT_PhieuNhap(MaPN, MaSP), CT_PhieuXuat(MaPX, MaSP), CT_KiemKe(MaKK, MaSP), CT_PhieuTraHang(MaPTH, MaSP), CT_KhuyenMai(MaKM, MaSP).")

    doc.add_heading("7. Ví dụ document MongoDB", level=1)
    add_code(doc, '''// LoaiHang
auto = {
  _id: ObjectId("..."),
  MaLoai: 1,
  TenLoai: "Sữa",
  MoTa: "Sản phẩm sữa cho mẹ và bé"
}

// SanPham
{
  _id: ObjectId("..."),
  MaSP: "SP001",
  MaLoai: ObjectId("..."), // FK logic -> LoaiHang._id
  TenSP: "Sữa Aptamil số 2 900g",
  GiaNhap: 420000,
  GiaBan: 520000,
  TrangThai: "Đang bán"
}''')

    doc.add_heading("8. Cách kiểm soát khóa ngoại", level=1)
    doc.add_paragraph("Trước khi thêm hoặc sửa document con, backend phải tìm document cha. Nếu không tìm thấy thì trả về lỗi và không ghi dữ liệu. Trước khi xóa document cha, backend kiểm tra các collection con; nếu đang được tham chiếu thì từ chối xóa. Các nghiệp vụ cập nhật nhiều collection nên thực hiện trong transaction.")
    add_code(doc, '''const category = await db.collection("LoaiHang").findOne({
  _id: new ObjectId(body.MaLoai)
});
if (!category) throw new Error("Loại hàng không tồn tại");''')

    doc.add_heading("9. Lưu ý khi nộp", level=1)
    for text in [
        "Giữ nguyên sơ đồ 25 bảng logic hiện tại; không cần vẽ lại toàn bộ.",
        "Bổ sung _id: ObjectId vào mỗi bảng/collection và ghi chú đây là khóa chính MongoDB.",
        "Đánh dấu Ma... là UNIQUE; các trường ObjectId tham chiếu là khóa ngoại logic.",
        "Tên collection trong Word phải khớp với backend: CT_DonHang, CT_HoaDon, CT_PhieuNhap và các collection chi tiết tương ứng.",
        "Nộp kèm schema.sql nếu đề yêu cầu thể hiện PK/FK theo mô hình quan hệ, và nộp script MongoDB để chứng minh triển khai thực tế.",
    ]:
        doc.add_paragraph(text, style="List Bullet")
    doc.add_paragraph("Kết luận: mô hình bảng cũ được giữ lại ở mức logic; MongoDB là cách triển khai vật lý của mô hình đó với _id, ObjectId, unique index, schema validation và kiểm tra quan hệ tại backend.")

    doc.save(OUTPUT)
    print(OUTPUT)
    print(DIAGRAM)


if __name__ == "__main__":
    main()
