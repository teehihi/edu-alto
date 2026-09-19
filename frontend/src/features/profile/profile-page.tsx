"use client";

import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  ImageIcon,
  Mail,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { FeedbackModal, type FeedbackTone } from "@/components/ui/feedback-modal";
import { ProfileSkeleton } from "@/components/ui/skeleton";
import { resolveAvatarUrl, UserAvatar } from "@/components/ui/user-avatar";
import { useAuth, type UserProfile } from "@/features/auth/auth-client";
import { AlertMessage, FormField } from "@/features/auth/form-field";
import { getFriendlyError } from "@/features/auth/form-utils";
import { cn } from "@/lib/cn";

type ActiveTab = "personal" | "instructor" | "reviews";

export function ProfilePage() {
  const { user, loading: authLoading, isAuthenticated, getProfile, updateProfile, uploadAvatar, updateUserAvatar } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("personal");
  const [profileData, setProfileData] = useState<UserProfile | null>(null);

  // Split name state for Figma layout (Họ và Tên lót + Tên)
  const [familyName, setFamilyName] = useState("");
  const [givenName, setGivenName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [savedAvatarUrl, setSavedAvatarUrl] = useState("");
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState("vi");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");

  // Student Form State
  const [learningGoal, setLearningGoal] = useState("");
  const [occupation, setOccupation] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [interests, setInterests] = useState("");

  // Instructor Form State
  const [expertise, setExpertise] = useState("");
  const [experienceYears, setExperienceYears] = useState<string>("");
  const [teachingExperience, setTeachingExperience] = useState("");
  const [qualificationSummary, setQualificationSummary] = useState("");
  const [specialties, setSpecialties] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    tone?: FeedbackTone;
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    tone: "success",
    confirmText: "Đã hiểu"
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Avatar Upload States
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarFileName, setAvatarFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Teacher List States (Student role - Node 33-7705)
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherSort, setTeacherSort] = useState("relevance");
  const [teacherPage, setTeacherPage] = useState(1);

  const initialLoadDoneRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function splitFullName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { family: "", given: "" };
    if (parts.length === 1) return { family: "", given: parts[0] };
    const given = parts[parts.length - 1];
    const family = parts.slice(0, parts.length - 1).join(" ");
    return { family, given };
  }

  const populateForm = useCallback((data: UserProfile) => {
    setProfileData(data);
    const { family, given } = splitFullName(data.fullName || "");
    setFamilyName(family);
    setGivenName(given);
    setHeadline(data.headline || "");
    setBio(data.bio || "");
    setSavedAvatarUrl(data.avatarUrl || "");
    setPreviewAvatarUrl(null);
    setSelectedAvatarFile(null);
    setAvatarFileName("");
    setLanguage(data.language || "vi");
    setWebsiteUrl(data.websiteUrl || "");
    setXUrl(data.xUrl || "");
    setLinkedinUrl(data.linkedinUrl || "");
    setYoutubeUrl(data.youtubeUrl || "");
    setFacebookUrl(data.facebookUrl || "");

    if (data.studentProfile) {
      setLearningGoal(data.studentProfile.learningGoal || "");
      setOccupation(data.studentProfile.occupation || "");
      setEducationLevel(data.studentProfile.educationLevel || "");
      setInterests(data.studentProfile.interests || "");
    }

    if (data.instructorProfile) {
      setExpertise(data.instructorProfile.expertise || "");
      setExperienceYears(data.instructorProfile.experienceYears != null ? String(data.instructorProfile.experienceYears) : "");
      setTeachingExperience(data.instructorProfile.teachingExperience || "");
      setQualificationSummary(data.instructorProfile.qualificationSummary || "");
      setSpecialties(data.instructorProfile.specialties || "");
    }
  }, []);

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingProfile(true);
    setStatus(null);
    try {
      const data = await getProfile();
      populateForm(data);
      if (data.avatarUrl) {
        updateUserAvatar(data.avatarUrl);
      }
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể tải dữ liệu hồ sơ. Vui lòng thử lại.") });
    } finally {
      setLoadingProfile(false);
    }
  }, [isAuthenticated, getProfile, populateForm, updateUserAvatar]);

  useEffect(() => {
    if (isAuthenticated && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      loadProfile();
    }
  }, [isAuthenticated, loadProfile]);

  function handleReset() {
    if (profileData) {
      if (previewAvatarUrl) {
        URL.revokeObjectURL(previewAvatarUrl);
      }
      populateForm(profileData);
      setFieldErrors({});
      setSelectedAvatarFile(null);
      setAvatarFileName("");
      setPreviewAvatarUrl(null);
      setModalConfig({
        isOpen: true,
        title: "Đã hoàn tác thay đổi",
        description: "Thông tin đã được khôi phục về trạng thái ban đầu.",
        tone: "info",
        confirmText: "Đã hiểu"
      });
      setStatus({ tone: "info", message: "Đã hoàn tác các thay đổi chưa lưu." });
    }
  }

  function handleShareProfile() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setModalConfig({
        isOpen: true,
        title: "Đã sao chép liên kết!",
        description: "Đường dẫn trang cá nhân của bạn đã được sao chép vào bộ nhớ tạm. Bạn có thể chia sẻ liên kết này cho mọi người.",
        tone: "success",
        confirmText: "Tuyệt vời"
      });
      setTimeout(() => setCopiedShare(false), 2500);
    }
  }

  const enrolledTeachers = [
    {
      id: "1",
      name: "Thầy Hoàng Văn Dũng",
      role: "Phó trưởng khoa CNTT",
      image: "/images/home/instructor-dung.png"
    },
    {
      id: "2",
      name: "Thầy Hoàng Văn Dũng",
      role: "Phó trưởng khoa CNTT",
      image: "/images/home/instructor-dung.png"
    },
    {
      id: "3",
      name: "Thầy Hoàng Văn Dũng",
      role: "Phó trưởng khoa CNTT",
      image: "/images/home/instructor-dung.png"
    },
    {
      id: "4",
      name: "Thầy Hoàng Văn Dũng",
      role: "Phó trưởng khoa CNTT",
      image: "/images/home/instructor-dung.png"
    },
    {
      id: "5",
      name: "Thầy Hoàng Văn Dũng",
      role: "Phó trưởng khoa CNTT",
      image: "/images/home/instructor-dung.png"
    },
    {
      id: "6",
      name: "Thầy Hoàng Văn Dũng",
      role: "Phó trưởng khoa CNTT",
      image: "/images/home/instructor-dung.png"
    },
    {
      id: "7",
      name: "Thầy Hoàng Văn Dũng",
      role: "Phó trưởng khoa CNTT",
      image: "/images/home/instructor-dung.png"
    },
    {
      id: "8",
      name: "Thầy Hoàng Văn Dũng",
      role: "Phó trưởng khoa CNTT",
      image: "/images/home/instructor-dung.png"
    },
    {
      id: "9",
      name: "TS. Nguyễn Thành Sơn",
      role: "Trưởng bộ môn CSDL",
      image: "/images/home/instructor-son.png"
    },
    {
      id: "10",
      name: "ThS. Trần Mạnh Hùng",
      role: "Giảng viên Cao cấp",
      image: "/images/home/instructor-hung.png"
    },
    {
      id: "11",
      name: "TS. Đặng Thị Minh Tuấn",
      role: "Trưởng bộ môn Lý Luận",
      image: "/images/home/instructor-tuan.png"
    },
    {
      id: "12",
      name: "PSG. TS. Hoàng Văn Dũng",
      role: "Phó Trưởng khoa CNTT",
      image: "/images/home/instructor-dung.png"
    }
  ];

  function handleProcessFile(file: File) {
    const validMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!validMimes.includes(file.type)) {
      const errMsg = "Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG hoặc WebP).";
      setModalConfig({
        isOpen: true,
        title: "Định dạng không hỗ trợ",
        description: errMsg,
        tone: "error",
        confirmText: "Đã hiểu"
      });
      setStatus({ tone: "error", message: errMsg });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      const errMsg = "Kích thước ảnh đại diện không được vượt quá 5MB.";
      setModalConfig({
        isOpen: true,
        title: "Tệp ảnh quá lớn",
        description: errMsg,
        tone: "warning",
        confirmText: "Đã hiểu"
      });
      setStatus({ tone: "error", message: errMsg });
      return;
    }

    if (previewAvatarUrl) {
      URL.revokeObjectURL(previewAvatarUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setSelectedAvatarFile(file);
    setAvatarFileName(file.name);
    setPreviewAvatarUrl(previewUrl);
    setStatus({ tone: "info", message: `Đã chọn ảnh "${file.name}". Nhấn Lưu để cập nhật lên hệ thống.` });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  }

  function handleMessageTeacher(teacherName: string) {
    setStatus({ tone: "info", message: `Đang mở hộp thoại nhắn tin với ${teacherName}...` });
  }

  const combinedFullName = `${familyName.trim()} ${givenName.trim()}`.trim() || user?.fullName || "Người dùng EduAlto";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const nextErrors: Record<string, string> = {};
    if (combinedFullName.length < 2) {
      nextErrors.fullName = "Vui lòng nhập họ và tên hợp lệ.";
    }

    const isInstructorRole = user?.roles?.includes("INSTRUCTOR") || profileData?.instructorProfile != null;
    if (isInstructorRole && activeTab === "instructor" && expertise.trim().length < 2) {
      nextErrors.expertise = "Vui lòng nhập chuyên môn giảng dạy.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setSaving(true);
    try {
      let finalAvatarUrl = savedAvatarUrl;
      const uploadedNewAvatar = Boolean(selectedAvatarFile);

      // 1. If an image file was selected, upload directly to Cloudflare R2
      if (selectedAvatarFile) {
        setStatus({ tone: "info", message: "Đang tải ảnh đại diện lên Cloudflare R2..." });
        const avatarResult = await uploadAvatar(selectedAvatarFile);
        finalAvatarUrl = avatarResult.avatarUrl || "";
      }

      // 2. Update profile text details
      const updated = await updateProfile({
        fullName: combinedFullName,
        headline: headline.trim(),
        bio: bio.trim(),
        language: language.trim() || "vi",
        websiteUrl: websiteUrl.trim(),
        xUrl: xUrl.trim(),
        linkedinUrl: linkedinUrl.trim(),
        youtubeUrl: youtubeUrl.trim(),
        facebookUrl: facebookUrl.trim(),
        learningGoal: learningGoal.trim(),
        occupation: occupation.trim(),
        educationLevel: educationLevel.trim(),
        interests: interests.trim(),
        expertise: expertise.trim(),
        experienceYears: experienceYears ? parseInt(experienceYears, 10) : undefined,
        teachingExperience: teachingExperience.trim(),
        qualificationSummary: qualificationSummary.trim(),
        specialties: specialties.trim()
      });

      if (previewAvatarUrl) {
        URL.revokeObjectURL(previewAvatarUrl);
      }
      populateForm(updated);
      const resultingAvatar = updated.avatarUrl || finalAvatarUrl;
      if (resultingAvatar) {
        setSavedAvatarUrl(resultingAvatar);
        updateUserAvatar(resultingAvatar);
      }
      setPreviewAvatarUrl(null);
      setSelectedAvatarFile(null);
      setAvatarFileName("");

      setStatus({ tone: "success", message: "Cập nhật thông tin hồ sơ thành công!" });
      setModalConfig({
        isOpen: true,
        title: "Cập nhật thành công!",
        description: uploadedNewAvatar
          ? "Ảnh đại diện mới và thông tin hồ sơ của bạn đã được cập nhật thành công trên toàn hệ thống EduAlto."
          : "Thông tin hồ sơ của bạn đã được lưu và cập nhật thành công trên EduAlto.",
        tone: "success",
        confirmText: "Tuyệt vời"
      });
    } catch (error) {
      const errMsg = getFriendlyError(error, "Không thể lưu hồ sơ. Vui lòng kiểm tra lại thông tin.");
      setStatus({ tone: "error", message: errMsg });
      setModalConfig({
        isOpen: true,
        title: "Cập nhật không thành công",
        description: errMsg,
        tone: "error",
        confirmText: "Thử lại"
      });
    } finally {
      setSaving(false);
    }
  }

  const isInstructor = user?.roles?.includes("INSTRUCTOR") || profileData?.instructorProfile != null;
  const instructorVerified = Boolean(profileData?.instructorProfile?.verifiedAt);

  if (authLoading) {
    return (
      <div
        className="flex min-h-screen flex-col justify-between"
        style={{ background: "linear-gradient(180deg, #E6F7F2 0%, #F2FAF7 320px, #FFFFFF 680px, #FFFFFF 100%)" }}
      >
        <AppHeader transparent />
        <main className="flex-1 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-0">
            <ProfileSkeleton />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col justify-between animate-page"
      style={{ background: "linear-gradient(180deg, #E6F7F2 0%, #F2FAF7 320px, #FFFFFF 680px, #FFFFFF 100%)" }}
    >
      <AppHeader transparent />

      <main className="flex-1 py-6 sm:py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-0">
          {!isAuthenticated || !user ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-2xl font-bold text-primary">
                E
              </div>
              <h2 className="mt-4 text-xl font-bold text-heading">Bạn chưa đăng nhập</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Đăng nhập hoặc đăng ký tài khoản để khám phá khóa học và quản lý hồ sơ của bạn trên EduAlto.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  className="focus-ring inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-dark"
                  href="/login"
                >
                  Đăng nhập
                </Link>
                <Link
                  className="focus-ring inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-heading shadow-xs transition hover:bg-slate-50"
                  href="/register"
                >
                  Tạo tài khoản mới
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left Sidebar */}
              <aside className="lg:col-span-4">
                <div className="space-y-6">
                  {/* Profile Summary Card with Dotted Pattern */}
                  <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-7 text-center shadow-sm">
                    {/* Decorative Dot Grid */}
                    <div
                      className="pointer-events-none absolute left-6 top-6 grid grid-cols-3 gap-2 opacity-30"
                      aria-hidden="true"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      ))}
                    </div>

                    {/* Large Avatar */}
                    <div className="relative mx-auto flex items-center justify-center pt-2">
                      <UserAvatar
                        name={combinedFullName}
                        email={user.email}
                        avatarUrl={savedAvatarUrl}
                        size="2xl"
                        className="shadow-sm ring-4 ring-white"
                      />
                    </div>

                    {/* Full Name */}
                    <h2 className="mt-4 text-lg font-bold text-heading">{combinedFullName}</h2>

                    {/* Share Profile Button */}
                    <button
                      type="button"
                      onClick={handleShareProfile}
                      className="focus-ring mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-primary hover:text-primary hover:bg-primary-soft active:scale-95"
                    >
                      <span>{copiedShare ? "Đã sao chép link!" : "Chia sẻ hồ sơ"}</span>
                      <Share2 className="h-3.5 w-3.5 text-primary" />
                    </button>
                  </div>

                  {/* Navigation Tabs Card */}
                  <div className="rounded-3xl border border-slate-100 bg-white p-2.5 shadow-sm divide-y divide-slate-100">
                    <nav className="space-y-1" aria-label="Điều hướng hồ sơ">
                      <button
                        type="button"
                        onClick={() => setActiveTab("personal")}
                        className={cn(
                          "focus-ring flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm font-semibold transition",
                          activeTab === "personal"
                            ? "bg-primary text-white shadow-xs"
                            : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <span>Trang cá nhân</span>
                      </button>

                      <div className="pt-1">
                        <Link
                          href="/learning"
                          prefetch={false}
                          className="focus-ring flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <span>Quản lý học tập</span>
                          <ExternalLink className="h-4 w-4 text-primary" />
                        </Link>
                      </div>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab("instructor")}
                          className={cn(
                            "focus-ring flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm font-medium transition",
                            activeTab === "instructor"
                              ? "bg-primary text-white font-semibold shadow-xs"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <span>Giảng viên</span>
                          {isInstructor && instructorVerified && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Đã duyệt
                            </span>
                          )}
                        </button>
                      </div>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab("reviews")}
                          className={cn(
                            "focus-ring flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm font-medium transition",
                            activeTab === "reviews"
                              ? "bg-primary text-white font-semibold shadow-xs"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <span>Đánh giá của tôi</span>
                        </button>
                      </div>
                    </nav>
                  </div>
                </div>
              </aside>

              {/* Right Content Area */}
              <section className="lg:col-span-8">
                {status ? (
                  <div className="mb-6">
                    <AlertMessage tone={status.tone}>{status.message}</AlertMessage>
                  </div>
                ) : null}

                <form className="space-y-6" noValidate onSubmit={handleSubmit}>
                  {/* TAB 1: Trang cá nhân */}
                  {activeTab === "personal" && (
                    <>
                      {/* Card 1: Main Form Fields Card */}
                      <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            id="familyName"
                            label="Họ và Tên lót"
                            autoComplete="family-name"
                            placeholder="Nguyễn Nhật"
                            value={familyName}
                            error={fieldErrors.fullName}
                            onChange={(e) => setFamilyName(e.target.value)}
                            disabled={saving}
                          />

                          <FormField
                            id="givenName"
                            label="Tên"
                            autoComplete="given-name"
                            placeholder="Thiên"
                            value={givenName}
                            onChange={(e) => setGivenName(e.target.value)}
                            disabled={saving}
                          />
                        </div>

                        <FormField
                          id="headline"
                          label="Chức danh / Tiêu đề"
                          placeholder="Developer..."
                          value={headline}
                          onChange={(e) => setHeadline(e.target.value)}
                          disabled={saving}
                        />

                        <div className="space-y-1.5">
                          <label htmlFor="bio" className="text-xs font-semibold text-heading sm:text-sm">
                            Giới thiệu bản thân
                          </label>
                          <textarea
                            id="bio"
                            rows={4}
                            className="w-full rounded-xl border border-[#D8E1ED] bg-white p-3.5 text-sm text-heading placeholder:text-[#8A9AB3] outline-none transition duration-150 hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50"
                            placeholder="Kể cho chúng tôi và người dùng khác đôi nét về bạn..."
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="language" className="text-xs font-semibold text-heading sm:text-sm">
                            Ngôn ngữ
                          </label>
                          <div className="relative">
                            <select
                              id="language"
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              disabled={saving}
                              className="w-full appearance-none rounded-xl border border-[#D8E1ED] bg-white px-3.5 py-3 text-sm text-heading outline-none transition duration-150 hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            >
                              <option value="vi">Chọn ngôn ngữ</option>
                              <option value="vi">Tiếng Việt</option>
                              <option value="en">English (US)</option>
                              <option value="ja">日本語 (Japanese)</option>
                              <option value="ko">한국어 (Korean)</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Avatar Upload Card */}
                      <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-heading">Ảnh đại diện</h3>

                        {/* Large Clickable & Dropzone Preview Box matching Figma */}
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleProcessFile(file);
                          }}
                          className={cn(
                            "group relative flex h-52 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition",
                            isDragging
                              ? "border-primary bg-primary-soft/50"
                              : "border-slate-200 bg-[#EEF2F6] hover:border-primary hover:bg-[#EBF7F2]/40"
                          )}
                          role="button"
                          tabIndex={0}
                          aria-label="Tải lên ảnh đại diện"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              fileInputRef.current?.click();
                            }
                          }}
                        >
                          {previewAvatarUrl ? (
                            <div className="relative h-full w-full">
                              <img
                                src={previewAvatarUrl}
                                alt="Xem trước ảnh đại diện"
                                className="h-full w-full object-contain"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition duration-150 group-hover:opacity-100">
                                <span className="rounded-xl bg-white/95 px-4 py-2 text-xs font-semibold text-slate-800 shadow-md">
                                  Kéo thả ảnh khác hoặc Chọn tệp
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-6 text-center">
                              <UploadCloud className="mb-2 h-10 w-10 text-slate-400 transition group-hover:text-primary" aria-hidden="true" />
                              <p className="text-sm font-medium text-slate-600">
                                Kéo thả vào đây hoặc <span className="font-semibold text-primary underline underline-offset-2">Chọn tệp</span>
                              </p>
                              <p className="mt-1 text-xs text-slate-400">PNG, JPG hoặc WebP</p>
                            </div>
                          )}
                        </div>

                        {/* Hidden file input */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />

                        {/* File name display input */}
                        <div className="space-y-1.5 pt-1">
                          <label htmlFor="avatarFileName" className="text-xs font-semibold text-heading sm:text-sm">
                            Thêm/Chỉnh sửa ảnh đại diện
                          </label>
                          <input
                            id="avatarFileName"
                            type="text"
                            readOnly
                            value={avatarFileName}
                            onClick={() => fileInputRef.current?.click()}
                            placeholder="Kéo thả vào đây hoặc Chọn tệp"
                            disabled={saving}
                            className="w-full rounded-xl border border-[#D8E1ED] bg-white px-3.5 py-2.5 text-sm text-heading placeholder:text-[#8A9AB3] outline-none transition duration-150 cursor-pointer hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={saving}
                            className="focus-ring inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
                          >
                            {saving ? "Đang lưu..." : "Lưu"}
                          </button>
                        </div>
                      </div>

                      {/* Card 3: Social Links Card */}
                      <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-heading">Liên kết</h3>

                        <div className="space-y-4 pt-1">
                          <FormField
                            id="websiteUrl"
                            label="Website"
                            placeholder="https://nteelab.vercel.app/"
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            disabled={saving}
                          />

                          <FormField
                            id="xUrl"
                            label="X (Trước đây là twitter)"
                            placeholder="https://x.com/yourprofile..."
                            value={xUrl}
                            onChange={(e) => setXUrl(e.target.value)}
                            disabled={saving}
                          />

                          <FormField
                            id="linkedinUrl"
                            label="Linkedin"
                            placeholder="https://www.linkedin.com/in/tee21/"
                            value={linkedinUrl}
                            onChange={(e) => setLinkedinUrl(e.target.value)}
                            disabled={saving}
                          />

                          <FormField
                            id="youtubeUrl"
                            label="Youtube"
                            placeholder="https://www.youtube.com/@tee.2105"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            disabled={saving}
                          />

                          <FormField
                            id="facebookUrl"
                            label="Facebook"
                            placeholder="https://www.facebook.com/nhatthien.nguyen.566"
                            value={facebookUrl}
                            onChange={(e) => setFacebookUrl(e.target.value)}
                            disabled={saving}
                          />
                        </div>

                        {/* Action buttons at bottom of Card 3 matching Figma */}
                        <div className="flex items-center gap-3 pt-3">
                          <button
                            type="submit"
                            disabled={saving}
                            aria-label="Cập nhật"
                            className="focus-ring inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
                          >
                            {saving ? "Đang lưu..." : "Cập nhật"}
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={handleReset}
                            className="focus-ring inline-flex items-center justify-center rounded-xl bg-[#475569] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#334155] disabled:opacity-50"
                          >
                            Huỷ
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                      {/* TAB 2: Giảng viên (Node 33-7705 for Student / Node 33-6694 for Instructor) */}
                      {activeTab === "instructor" && (
                    !isInstructor ? (
                      /* MY TEACHERS VIEW FOR STUDENTS (Node 33-7705) */
                      <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                        {/* Header: Title */}
                        <div>
                          <h2 className="text-xl font-bold text-heading">
                            Giảng Viên <span className="text-sm font-semibold text-primary">({enrolledTeachers.length})</span>
                          </h2>
                        </div>

                        {/* Search and Sort/Filter Controls */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          {/* Search Input */}
                          <div className="relative flex-1 max-w-sm">
                            <input
                              type="text"
                              value={teacherSearch}
                              onChange={(e) => setTeacherSearch(e.target.value)}
                              placeholder="Tìm kiếm giảng viên..."
                              className="w-full rounded-xl border border-[#D8E1ED] bg-white py-2.5 pl-3.5 pr-10 text-sm text-heading placeholder:text-[#8A9AB3] outline-none transition duration-150 hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            <Search className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                          </div>

                          {/* Sort & Filter controls */}
                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <div className="flex items-center gap-2 text-xs font-semibold text-heading sm:text-sm">
                              <span className="text-muted text-xs">Xếp theo</span>
                              <div className="relative">
                                <select
                                  value={teacherSort}
                                  onChange={(e) => setTeacherSort(e.target.value)}
                                  className="appearance-none rounded-xl border border-[#D8E1ED] bg-white py-2 pl-3 pr-8 text-xs font-semibold text-heading outline-none hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
                                >
                                  <option value="relevance">Độ liên quan</option>
                                  <option value="name">Tên giảng viên</option>
                                  <option value="recent">Mới tham gia</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              </div>
                            </div>

                            <button
                              type="button"
                              className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-white px-3.5 py-2 text-xs font-semibold text-primary shadow-xs transition hover:bg-primary-soft"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                              <span>Lọc</span>
                            </button>
                          </div>
                        </div>

                        {/* 4-column Grid of Teacher Cards */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 pt-1">
                          {enrolledTeachers
                            .filter((t) => t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || t.role.toLowerCase().includes(teacherSearch.toLowerCase()))
                            .slice((teacherPage - 1) * 8, teacherPage * 8)
                            .map((teacher, idx) => (
                              <div
                                key={`${teacher.id}-${idx}`}
                                className="group flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm transition hover:shadow-md"
                              >
                                <div className="relative h-36 w-full overflow-hidden rounded-xl bg-slate-100">
                                  <img
                                    src={teacher.image}
                                    alt={teacher.name}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                  />
                                </div>
                                <h3 className="mt-3 text-center text-sm font-bold text-heading line-clamp-1">
                                  {teacher.name}
                                </h3>
                                <p className="mt-0.5 text-center text-xs text-muted line-clamp-1">
                                  {teacher.role}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleMessageTeacher(teacher.name)}
                                  className="focus-ring mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-dark active:scale-95"
                                >
                                  <span>Gửi Tin Nhắn</span>
                                  <Mail className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                        </div>

                        {/* Pagination and decorative dots matching Figma */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setTeacherPage((p) => Math.max(1, p - 1))}
                              disabled={teacherPage === 1}
                              aria-label="Trang trước"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
                            >
                              &lt;
                            </button>
                            {[1, 2, 3].map((page) => (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setTeacherPage(page)}
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition",
                                  teacherPage === page
                                    ? "bg-primary text-white font-bold shadow-xs"
                                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                {page}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setTeacherPage((p) => Math.min(3, p + 1))}
                              disabled={teacherPage === 3}
                              aria-label="Trang sau"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
                            >
                              &gt;
                            </button>
                          </div>

                          {/* Decorative Dot Grid */}
                          <div
                            className="hidden sm:grid grid-cols-6 gap-2 opacity-25"
                            aria-hidden="true"
                          >
                            {Array.from({ length: 18 }).map((_, i) => (
                              <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* INSTRUCTOR QUALIFICATIONS FORM (Node 33-6694) */
                      <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <h2 className="text-lg font-bold text-heading">Thông tin giảng viên & Chuyên môn</h2>
                            <p className="mt-1 text-xs text-muted sm:text-sm">
                              Hồ sơ năng lực giảng dạy phục vụ việc tạo khóa học và thẩm định chứng chỉ.
                            </p>
                          </div>
                          <div>
                            {instructorVerified ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                Giảng viên đã xác thực
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                                Đang chờ duyệt chuyên môn
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                              id="expertise"
                              label="Chuyên môn giảng dạy chính"
                              placeholder="Ví dụ: Kỹ thuật phần mềm & Điện toán đám mây"
                              value={expertise}
                              error={fieldErrors.expertise}
                              onChange={(e) => setExpertise(e.target.value)}
                              disabled={saving}
                            />

                            <FormField
                              id="experienceYears"
                              label="Số năm kinh nghiệm"
                              type="number"
                              placeholder="Ví dụ: 5"
                              value={experienceYears}
                              onChange={(e) => setExperienceYears(e.target.value)}
                              disabled={saving}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label htmlFor="teachingExperience" className="text-xs font-semibold text-heading sm:text-sm">
                              Kinh nghiệm giảng dạy & Đào tạo
                            </label>
                            <textarea
                              id="teachingExperience"
                              rows={3}
                              className="w-full rounded-xl border border-[#D8E1ED] bg-white p-3 text-sm text-heading placeholder:text-[#8A9AB3] disabled:bg-slate-50 outline-none transition duration-150 hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary"
                              placeholder="Mô tả các khóa học, trung tâm hoặc trường đại học bạn từng giảng dạy..."
                              value={teachingExperience}
                              onChange={(e) => setTeachingExperience(e.target.value)}
                              disabled={saving}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label htmlFor="qualificationSummary" className="text-xs font-semibold text-heading sm:text-sm">
                              Tóm tắt bằng cấp & Chứng chỉ chuyên môn
                            </label>
                            <textarea
                              id="qualificationSummary"
                              rows={3}
                              className="w-full rounded-xl border border-[#D8E1ED] bg-white p-3 text-sm text-heading placeholder:text-[#8A9AB3] disabled:bg-slate-50 outline-none transition duration-150 hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary"
                              placeholder="Ví dụ: Thạc sĩ Khoa học Máy tính, Chứng chỉ AWS Solutions Architect Professional..."
                              value={qualificationSummary}
                              onChange={(e) => setQualificationSummary(e.target.value)}
                              disabled={saving}
                            />
                          </div>

                          <FormField
                            id="specialties"
                            label="Lĩnh vực chuyên sâu"
                            placeholder="Ví dụ: Microservices, Domain-Driven Design, DevOps CI/CD"
                            value={specialties}
                            onChange={(e) => setSpecialties(e.target.value)}
                            disabled={saving}
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-3">
                          <button
                            type="submit"
                            disabled={saving}
                            aria-label="Cập nhật"
                            className="focus-ring inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
                          >
                            {saving ? "Đang lưu..." : "Cập nhật"}
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={handleReset}
                            className="focus-ring inline-flex items-center justify-center rounded-xl bg-[#475569] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#334155] disabled:opacity-50"
                          >
                            Huỷ
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  {/* TAB 4: Đánh giá của tôi */}
                  {activeTab === "reviews" && (
                    <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm space-y-4">
                      <div>
                        <h2 className="text-lg font-bold text-heading">Đánh giá & Nhận xét của tôi</h2>
                        <p className="mt-1 text-xs text-muted sm:text-sm">
                          Xem lại các đánh giá bạn đã viết cho các khóa học trên nền tảng EduAlto.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-3 text-sm font-semibold text-heading">Chưa có đánh giá nào</p>
                        <p className="mt-1 text-xs text-muted">
                          Sau khi hoàn thành các bài học, bạn có thể gửi phản hồi và chấm điểm khóa học tại đây.
                        </p>
                      </div>
                    </div>
                  )}
                </form>
              </section>
            </div>
          )}
        </div>
      </main>

      <FeedbackModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        description={modalConfig.description}
        tone={modalConfig.tone}
        confirmText={modalConfig.confirmText}
      />

      <Footer />
    </div>
  );
}
