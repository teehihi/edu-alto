import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VerifyCertificatePage } from "./verify-certificate-page";

const { verifyCertificateMock, downloadPublicCertificatePdfMock } = vi.hoisted(() => ({
  verifyCertificateMock: vi.fn(),
  downloadPublicCertificatePdfMock: vi.fn(),
}));

vi.mock("@/components/layout/app-header", () => ({
  AppHeader: () => <header data-testid="app-header">Header</header>,
}));

vi.mock("@/lib/certificate-client", () => ({
  verifyCertificate: verifyCertificateMock,
  downloadPublicCertificatePdf: downloadPublicCertificatePdfMock,
}));

const mockVerificationData = {
  certificateNumber: "EA-TEST888999",
  courseId: "c-100",
  courseTitle: "Lập trình TypeScript và Next.js Toàn diện",
  studentName: "Phạm Văn Hậu",
  instructorName: "Nguyễn Giảng Viên",
  issuedAt: "2026-10-28T08:00:00Z",
  isValid: true,
  verificationUrl: "http://localhost:3000/certificates/verify/EA-TEST888999",
  qrCodeDataUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=",
};

describe("VerifyCertificatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders verified certificate information including student name and issue date", async () => {
    verifyCertificateMock.mockResolvedValue(mockVerificationData);

    render(<VerifyCertificatePage code="EA-TEST888999" />);

    expect(await screen.findByText("Chứng nhận hợp lệ & Đã xác thực")).toBeInTheDocument();
    expect(screen.getAllByText("Phạm Văn Hậu").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Lập trình TypeScript và Next.js Toàn diện").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("EA-TEST888999").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("TEM BẢO MẬT").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("CHỐNG LÀM GIẢ").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /Tải file PDF gốc/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chia sẻ/ })).toBeInTheDocument();
  });

  it("handles downloading public certificate PDF", async () => {
    const user = userEvent.setup();
    const fakeBlob = new Blob(["pdf-bytes"], { type: "application/pdf" });
    downloadPublicCertificatePdfMock.mockResolvedValue(fakeBlob);

    const createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/cert.pdf");
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    verifyCertificateMock.mockResolvedValue(mockVerificationData);

    render(<VerifyCertificatePage code="EA-TEST888999" />);

    const downloadBtn = await screen.findByRole("button", { name: /Tải file PDF gốc/ });
    await user.click(downloadBtn);

    expect(downloadPublicCertificatePdfMock).toHaveBeenCalledWith("EA-TEST888999");
    expect(createObjectURL).toHaveBeenCalledWith(fakeBlob);
  });

  it("renders error view when certificate code is not found", async () => {
    verifyCertificateMock.mockRejectedValue(new Error("Chứng chỉ không tồn tại"));

    render(<VerifyCertificatePage code="EA-INVALID" />);

    expect(await screen.findByText("Không thể xác thực chứng chỉ")).toBeInTheDocument();
    expect(screen.getByText("EA-INVALID")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kiểm tra lại/ })).toBeInTheDocument();
  });
});
