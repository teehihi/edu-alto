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

const mockVerifyResult = {
  certificateNumber: "EA-VERIFY999",
  courseId: "course-456",
  courseTitle: "TypeScript Nâng Cao",
  studentName: "Lê Thị B",
  instructorName: "Vũ Giảng Viên",
  issuedAt: "2026-10-26T14:30:00Z",
  isValid: true,
  verificationUrl: "http://localhost:3000/certificates/verify/EA-VERIFY999",
  qrCodeDataUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=",
};

describe("VerifyCertificatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders verified certificate information when valid code is provided", async () => {
    verifyCertificateMock.mockResolvedValue(mockVerifyResult);

    render(<VerifyCertificatePage code="EA-VERIFY999" />);

    expect(await screen.findByText("Chứng nhận hợp lệ & Đã xác thực")).toBeInTheDocument();
    expect(screen.getByText("TypeScript Nâng Cao")).toBeInTheDocument();
    expect(screen.getByText("Lê Thị B")).toBeInTheDocument();
    expect(screen.getByText("Vũ Giảng Viên")).toBeInTheDocument();
    expect(screen.getByText("EA-VERIFY999")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tải PDF/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sao chép liên kết/ })).toBeInTheDocument();
  });

  it("renders error state when certificate is not found", async () => {
    verifyCertificateMock.mockRejectedValue(
      new Error("Không tìm thấy chứng chỉ hoặc mã xác thực không hợp lệ"),
    );

    render(<VerifyCertificatePage code="EA-INVALID" />);

    expect(await screen.findByText("Không thể xác thực chứng chỉ")).toBeInTheDocument();
    expect(screen.getByText("EA-INVALID")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Khám phá khóa học EduAlto/ })).toBeInTheDocument();
  });

  it("downloads PDF when clicking download button on public verify page", async () => {
    const user = userEvent.setup();
    verifyCertificateMock.mockResolvedValue(mockVerifyResult);
    const fakeBlob = new Blob(["fake-public-pdf"], { type: "application/pdf" });
    downloadPublicCertificatePdfMock.mockResolvedValue(fakeBlob);

    const createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/cert-public.pdf");
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    render(<VerifyCertificatePage code="EA-VERIFY999" />);

    const downloadBtn = await screen.findByRole("button", { name: /Tải PDF/ });
    await user.click(downloadBtn);

    expect(downloadPublicCertificatePdfMock).toHaveBeenCalledWith("EA-VERIFY999");
    expect(createObjectURL).toHaveBeenCalledWith(fakeBlob);
  });
});
