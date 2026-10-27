import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseCertificatePage } from "./course-certificate-page";

const { fetchMyCourseCertificateMock, downloadCertificatePdfMock } = vi.hoisted(() => ({
  fetchMyCourseCertificateMock: vi.fn(),
  downloadCertificatePdfMock: vi.fn(),
}));

const mockRouter = { replace: vi.fn(), push: vi.fn() };
const getAccessToken = vi.fn().mockResolvedValue("mock-access-token");
const mockUser = { id: "user-1", email: "student@edualto.vn", role: "STUDENT" };

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("@/components/layout/app-header", () => ({
  AppHeader: () => <header data-testid="app-header">Header</header>,
}));

vi.mock("@/lib/auth-session", () => ({
  useAuthSession: () => ({
    user: mockUser,
    isLoading: false,
    getAccessToken,
  }),
}));

vi.mock("@/lib/certificate-client", () => ({
  fetchMyCourseCertificate: fetchMyCourseCertificateMock,
  downloadCertificatePdf: downloadCertificatePdfMock,
}));

const mockCert = {
  id: "cert-1",
  certificateNumber: "EA-TEST12345",
  courseId: "course-123",
  courseTitle: "Lập trình React Chuyên sâu",
  studentName: "Nguyễn Văn A",
  instructorName: "Trần Giảng Viên",
  issuedAt: "2026-10-25T10:00:00Z",
  verificationUrl: "http://localhost:3000/certificates/verify/EA-TEST12345",
  qrCodeDataUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=",
};

describe("CourseCertificatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccessToken.mockResolvedValue("mock-access-token");
    fetchMyCourseCertificateMock.mockResolvedValue(mockCert);
  });

  it("renders certificate with student name, course title, and QR code", async () => {
    render(<CourseCertificatePage courseId="course-123" />);

    expect(await screen.findByText("Chứng nhận hoàn thành")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
    expect(screen.getByText("Lập trình React Chuyên sâu")).toBeInTheDocument();
    expect(screen.getByText("EA-TEST12345")).toBeInTheDocument();
    expect(screen.getByAltText("Mã QR xác thực chứng chỉ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tải PDF chứng chỉ/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chia sẻ/ })).toBeInTheDocument();
  });

  it("downloads PDF when clicking download button", async () => {
    const user = userEvent.setup();
    const fakeBlob = new Blob(["fake-pdf"], { type: "application/pdf" });
    downloadCertificatePdfMock.mockResolvedValue(fakeBlob);

    const createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/cert.pdf");
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    render(<CourseCertificatePage courseId="course-123" />);

    const downloadBtn = await screen.findByRole("button", { name: /Tải PDF chứng chỉ/ });
    await user.click(downloadBtn);

    expect(downloadCertificatePdfMock).toHaveBeenCalledWith(
      "course-123",
      "mock-access-token",
      expect.any(String),
    );
    expect(createObjectURL).toHaveBeenCalledWith(fakeBlob);
  });

  it("copies verification link to clipboard when clicking share button", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    render(<CourseCertificatePage courseId="course-123" />);

    const shareBtn = await screen.findByRole("button", { name: /Chia sẻ/ });
    await user.click(shareBtn);

    expect(writeTextMock).toHaveBeenCalledWith(mockCert.verificationUrl);
    expect(await screen.findByText("Đã sao chép")).toBeInTheDocument();
  });
});
