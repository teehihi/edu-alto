"use client";

import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Facebook,
  Globe,
  ImageIcon,
  Linkedin,
  Mail,
  Pencil,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UploadCloud,
  Youtube
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
    </svg>
  );
}
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { CustomSelect } from "@/components/ui/custom-select";
import { FeedbackModal, type FeedbackTone } from "@/components/ui/feedback-modal";
import { ProfileSkeleton } from "@/components/ui/skeleton";
import { resolveAvatarUrl, UserAvatar } from "@/components/ui/user-avatar";
import { getPublicProfile, useAuth, type UserProfile } from "@/features/auth/auth-client";
import { AlertMessage, FormField } from "@/features/auth/form-field";
import { getFriendlyError } from "@/features/auth/form-utils";
import { ApiClientError } from "@/lib/api";
import { cn } from "@/lib/cn";

type ActiveTab = "personal" | "instructor" | "reviews";

export interface ProfilePageProps {
  targetIdentifier?: string;
  defaultEditing?: boolean;
}

export function ProfilePage({ targetIdentifier, defaultEditing = false }: ProfilePageProps) {
  const { user, loading: authLoading, isAuthenticated, getProfile, updateProfile, uploadAvatar, updateUserAvatar } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("personal");
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(defaultEditing);

  // Split name state for Figma layout (Họ và Tên lót + Tên)
  const [familyName, setFamilyName] = useState("");
  const [givenName, setGivenName] = useState("");
  const [headline, setHeadline] = useState("");
  const [customHandle, setCustomHandle] = useState("");
  const [bio, setBio] = useState("");
  const [savedAvatarUrl, setSavedAvatarUrl] = useState("");
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState("vi");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
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

  // Determine if viewing own profile
  const isOwner = useMemo(() => {
    if (!targetIdentifier) return true;
    if (!profileData) return false;
    if (user && (user.id === profileData.id || user.email === profileData.email)) {
      return true;
    }
    return false;
  }, [targetIdentifier, profileData, user]);

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
    setCustomHandle(data.customHandle || "");
    setBio(data.bio || "");
    setSavedAvatarUrl(data.avatarUrl || "");
    setPreviewAvatarUrl(null);
    setSelectedAvatarFile(null);
    setAvatarFileName("");
    setLanguage(data.language || "vi");
    setWebsiteUrl(data.websiteUrl || "");
    setTiktokUrl(data.tiktokUrl || data.xUrl || "");
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

  function handleCancelEdit() {
    if (profileData) {
      populateForm(profileData);
    }
    setIsEditing(false);
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const loadProfile = useCallback(async () => {
    if (!targetIdentifier && !isAuthenticated) {
      return;
    }
    setLoadingProfile(true);
    setStatus(null);
    try {
      let data: UserProfile;
      if (targetIdentifier) {
        data = await getPublicProfile(targetIdentifier);
      } else {
        data = await getProfile();
      }
      populateForm(data);
      if (data.avatarUrl) {
        updateUserAvatar(data.avatarUrl);
      }
    } catch (err: unknown) {
      const message = getFriendlyError(err);
      setStatus({ tone: "error", message });
    } finally {
      setLoadingProfile(false);
    }
  }, [getProfile, targetIdentifier, isAuthenticated, populateForm, updateUserAvatar]);

  useEffect(() => {
    if (!authLoading && !initialLoadDoneRef.current) {
      if (targetIdentifier || isAuthenticated) {
        initialLoadDoneRef.current = true;
        loadProfile();
      }
    }
  }, [targetIdentifier, authLoading, isAuthenticated, loadProfile]);

  const combinedFullName = useMemo(() => {
    const combined = `${familyName.trim()} ${givenName.trim()}`.trim();
    return combined || profileData?.fullName || user?.fullName || "Người dùng EduAlto";
  }, [familyName, givenName, profileData, user]);

  const isInstructor = useMemo(() => {
    return user?.roles.includes("INSTRUCTOR") || profileData?.roles.includes("INSTRUCTOR") || false;
  }, [user, profileData]);

  const instructorVerified = useMemo(() => {
    return Boolean(profileData?.instructorProfile?.verifiedAt);
  }, [profileData]);

  const profileLanguageLabel = useMemo(() => {
    const map: Record<string, string> = {
      vi: "Tiếng Việt",
      en: "English (US)",
      ja: "日本語",
      ko: "한국어"
    };
    return map[language] || "Tiếng Việt";
  }, [language]);

  function handleShareProfile() {
    const handleOrId = profileData?.customHandle || profileData?.id || user?.id;
    if (!handleOrId) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/profile/${handleOrId}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  }

  const teacherDataList = [
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

  const teacherSortOptions = [
    { value: "relevance", label: "Độ liên quan" },
    { value: "name", label: "Tên giảng viên" },
    { value: "recent", label: "Mới tham gia" }
  ];

  const languageOptions = [
    { value: "vi", label: "Tiếng Việt" },
    { value: "en", label: "English (US)" },
    { value: "ja", label: "日本語 (Japanese)" },
    { value: "ko", label: "한국어 (Korean)" }
  ];

  const filteredAndSortedTeachers = useMemo(() => {
    let list = [...teacherDataList];
    if (teacherSearch.trim()) {
      const q = teacherSearch.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.role.toLowerCase().includes(q));
    }
    if (teacherSort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }
    return list;
  }, [teacherSearch, teacherSort]);

  const teacherTotalPages = Math.ceil(filteredAndSortedTeachers.length / 8) || 1;
  const currentTeachers = useMemo(() => {
    const start = (teacherPage - 1) * 8;
    return filteredAndSortedTeachers.slice(start, start + 8);
  }, [filteredAndSortedTeachers, teacherPage]);

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
      const errMsg = "Kích thước hình ảnh không được vượt quá 5MB.";
      setModalConfig({
        isOpen: true,
        title: "Tệp quá lớn",
        description: errMsg,
        tone: "error",
        confirmText: "Đã hiểu"
      });
      setStatus({ tone: "error", message: errMsg });
      return;
    }

    setSelectedAvatarFile(file);
    setAvatarFileName(file.name);
    const objectUrl = URL.createObjectURL(file);
    setPreviewAvatarUrl(objectUrl);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  }

  function scrollToFirstError(errors: Record<string, string>) {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return;

    const fieldOrder = [
      "familyName",
      "givenName",
      "headline",
      "customHandle",
      "bio",
      "language",
      "websiteUrl",
      "tiktokUrl",
      "linkedinUrl",
      "youtubeUrl",
      "facebookUrl",
      "learningGoal",
      "occupation",
      "educationLevel",
      "interests",
      "expertise",
      "experienceYears",
      "teachingExperience",
      "qualificationSummary",
      "specialties"
    ];

    const firstKey = fieldOrder.find((k) => errors[k]) || errorKeys[0];
    const element = document.getElementById(firstKey);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof element.focus === "function") {
        element.focus({ preventScroll: true });
      }
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!givenName.trim()) {
      errors.givenName = "Vui lòng nhập tên của bạn";
    }

    if (customHandle.trim()) {
      const handle = customHandle.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(handle)) {
        errors.customHandle = "Đường dẫn chỉ được chứa chữ thường không dấu (a-z), số (0-9) và dấu ., _ hoặc - (từ 3-30 ký tự)";
      }
    }

    if (websiteUrl.trim() && !/^https?:\/\//i.test(websiteUrl.trim())) {
      errors.websiteUrl = "Đường dẫn website phải bắt đầu bằng http:// hoặc https://";
    }

    if (tiktokUrl.trim() && !/^https?:\/\//i.test(tiktokUrl.trim())) {
      errors.tiktokUrl = "Đường dẫn TikTok phải bắt đầu bằng http:// hoặc https://";
    }

    if (experienceYears.trim()) {
      const parsed = Number(experienceYears);
      if (isNaN(parsed) || parsed < 0 || parsed > 70) {
        errors.experienceYears = "Số năm kinh nghiệm phải từ 0 đến 70 năm";
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setTimeout(() => scrollToFirstError(errors), 50);
      return false;
    }
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) {
      setStatus({ tone: "error", message: "Vui lòng kiểm tra lại các trường thông tin bị lỗi." });
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      let finalAvatarUrl = savedAvatarUrl;

      if (selectedAvatarFile) {
        try {
          const avatarRes = await uploadAvatar(selectedAvatarFile);
          if (avatarRes.avatarUrl) {
            finalAvatarUrl = avatarRes.avatarUrl;
            setSavedAvatarUrl(finalAvatarUrl);
            updateUserAvatar(finalAvatarUrl);
          }
        } catch (uploadErr) {
          console.error("Avatar upload failed:", uploadErr);
        }
      }

      const fullCombined = `${familyName.trim()} ${givenName.trim()}`.trim();
      const payload = {
        fullName: fullCombined || undefined,
        headline: headline.trim() || undefined,
        customHandle: customHandle.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: finalAvatarUrl || undefined,
        language: language || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        tiktokUrl: tiktokUrl.trim() || undefined,
        xUrl: tiktokUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
        facebookUrl: facebookUrl.trim() || undefined,
        learningGoal: isInstructor ? undefined : learningGoal.trim() || undefined,
        occupation: isInstructor ? undefined : occupation.trim() || undefined,
        educationLevel: isInstructor ? undefined : educationLevel.trim() || undefined,
        interests: isInstructor ? undefined : interests.trim() || undefined,
        expertise: isInstructor ? expertise.trim() || undefined : undefined,
        experienceYears: isInstructor && experienceYears ? Number(experienceYears) : undefined,
        teachingExperience: isInstructor ? teachingExperience.trim() || undefined : undefined,
        qualificationSummary: isInstructor ? qualificationSummary.trim() || undefined : undefined,
        specialties: isInstructor ? specialties.trim() || undefined : undefined
      };

      const updated = await updateProfile(payload);
      populateForm(updated);
      setIsEditing(false);

      const successMsg = "Cập nhật thông tin hồ sơ thành công!";
      setStatus({ tone: "success", message: successMsg });
      setModalConfig({
        isOpen: true,
        title: "Thành công!",
        description: successMsg,
        tone: "success",
        confirmText: "Tuyệt vời"
      });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "HANDLE_ALREADY_EXISTS") {
          const handleErr = { customHandle: "Đường dẫn cá nhân này đã được sử dụng bởi người khác" };
          setFieldErrors(handleErr);
          setTimeout(() => scrollToFirstError(handleErr), 50);
        } else if (err.code === "INVALID_CUSTOM_HANDLE") {
          const handleErr = { customHandle: "Đường dẫn chỉ được chứa chữ thường không dấu (a-z), số (0-9) và dấu ., _ hoặc - (từ 3-30 ký tự)" };
          setFieldErrors(handleErr);
          setTimeout(() => scrollToFirstError(handleErr), 50);
        }
      }
      const errorMsg = getFriendlyError(err, "Không thể cập nhật hồ sơ. Vui lòng thử lại.");
      setStatus({ tone: "error", message: errorMsg });
      setModalConfig({
        isOpen: true,
        title: "Đã xảy ra lỗi",
        description: errorMsg,
        tone: "error",
        confirmText: "Đã hiểu"
      });
    } finally {
      setSaving(false);
    }
  }

  function handleMessageTeacher(teacherName: string) {
    setModalConfig({
      isOpen: true,
      title: `Gửi tin nhắn đến ${teacherName}`,
      description: "Tính năng trò chuyện trực tiếp với giảng viên sẽ sớm ra mắt trong phiên bản tiếp theo!",
      tone: "info",
      confirmText: "Đã hiểu"
    });
  }

  if (authLoading || loadingProfile) {
    return (
      <div
        className="flex min-h-screen flex-col justify-between"
        style={{ background: "linear-gradient(180deg, #E6F7F2 0%, #F2FAF7 320px, #FFFFFF 680px, #FFFFFF 100%)" }}
      >
        <AppHeader transparent />
        <main className="flex-1 min-h-[calc(100vh-72px)] py-6 sm:py-8 flex flex-col justify-start">
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-12">
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

      <main className="flex-1 min-h-[calc(100vh-72px)] py-6 sm:py-8 flex flex-col justify-start">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-12">
          {!targetIdentifier && (!isAuthenticated || !user) ? (
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
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 xl:gap-8">
              {/* Left Sidebar */}
              <aside className="lg:sticky lg:top-24 lg:col-span-4 xl:col-span-3">
                <div className="space-y-6">
                  {/* Profile Summary Card with Dotted Pattern */}
                  <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 sm:p-7 text-center shadow-sm">
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
                        email={profileData?.email || user?.email || ""}
                        avatarUrl={savedAvatarUrl}
                        size="2xl"
                        className="shadow-sm ring-4 ring-white"
                      />
                    </div>

                    {/* Full Name */}
                    <h2 className="mt-4 text-lg font-bold text-heading">{combinedFullName}</h2>

                    {/* Share Profile Button with Morph Animation */}
                    <div className="mt-3.5 flex justify-center">
                      <button
                        type="button"
                        onClick={handleShareProfile}
                        aria-label="Chia sẻ hồ sơ"
                        className={cn(
                          "focus-ring relative inline-flex h-9 min-w-[130px] items-center justify-center overflow-hidden rounded-xl border text-xs font-semibold shadow-xs transition-all duration-300 active:scale-95",
                          copiedShare
                            ? "border-primary bg-primary text-white shadow-primary/20"
                            : "border-slate-200/90 bg-white text-slate-700 hover:border-primary hover:text-primary hover:bg-[#F2FAF7]"
                        )}
                      >
                        {/* State 1: Chia sẻ hồ sơ + Share2 icon */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 transition-all duration-300",
                            copiedShare ? "-translate-y-8 opacity-0" : "translate-y-0 opacity-100"
                          )}
                        >
                          <span>Chia sẻ hồ sơ</span>
                          <Share2 className="h-3.5 w-3.5 text-primary" />
                        </span>

                        {/* State 2: Đã sao chép + CheckCircle2 icon */}
                        <span
                          className={cn(
                            "absolute inline-flex items-center gap-1 font-semibold text-white transition-all duration-300",
                            copiedShare ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                          <span>Đã sao chép</span>
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Navigation Tabs Card - Only visible to profile owner */}
                  {isOwner && (
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
                  )}
                </div>
              </aside>

              {/* Right Content Area */}
              <section className="lg:col-span-8 xl:col-span-9">
                {status ? (
                  <div className="mb-6">
                    <AlertMessage tone={status.tone}>{status.message}</AlertMessage>
                  </div>
                ) : null}

                {/* TAB 1: Trang cá nhân */}
                {activeTab === "personal" && (
                  <>
                    {!isEditing ? (
                      /* VIEW MODE MATCHING MOCKUP */
                      <div className="space-y-6">
                        {/* Card 1: Thông tin cá nhân (Profile Details) */}
                        <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                          {/* Header: Name, Headline & Edit button / Language badge */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div>
                              <h1 className="text-xl sm:text-2xl font-bold text-heading">{combinedFullName}</h1>
                              <p className="mt-1 text-sm text-muted font-medium">
                                {headline || profileData?.headline || (isInstructor ? "Giảng viên tại EduAlto" : "Học viên tại EduAlto")}
                              </p>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <span className="inline-flex items-center rounded-full bg-[#EBF7F2] px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20">
                                {profileLanguageLabel}
                              </span>

                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => setIsEditing(true)}
                                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-white px-3.5 py-1.5 text-xs font-semibold text-primary shadow-xs transition hover:bg-primary-soft"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>Chỉnh sửa</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Giới thiệu bản thân */}
                          <div className="space-y-2">
                            <h3 className="text-sm font-bold text-heading">Giới thiệu bản thân</h3>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                              {bio ||
                                profileData?.bio ||
                                (isInstructor
                                  ? "Giảng viên tại nền tảng EduAlto."
                                  : "Học viên tại nền tảng học tập trực tuyến EduAlto.")}
                            </p>
                          </div>

                          {/* Stats in Body */}
                          {isInstructor ? (
                            <div className="flex items-center gap-6 pt-4 border-t border-slate-100 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-heading">12</span>
                                <span className="text-xs text-muted font-medium">Khoá học đã tạo</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-heading">2.4K</span>
                                <span className="text-xs text-muted font-medium">Học viên</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-base font-bold text-heading">4.9</span>
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-xs text-muted font-medium">Đánh giá</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-6 pt-4 border-t border-slate-100 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-heading">4</span>
                                <span className="text-xs text-muted font-medium">Khoá học đã tham gia</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-heading">12</span>
                                <span className="text-xs text-muted font-medium">Bài học đã hoàn thành</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card 2: Liên kết (Social & Web Links) */}
                        <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
                          <h3 className="text-lg font-bold text-heading">Liên kết</h3>

                          <div className="space-y-3 pt-1">
                            {/* Website */}
                            <div className="flex items-center gap-3.5 p-1 rounded-xl">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                <Globe className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted font-medium">Website</p>
                                {websiteUrl ? (
                                  <a
                                    href={websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs sm:text-sm font-semibold text-primary hover:underline truncate block"
                                  >
                                    {websiteUrl}
                                  </a>
                                ) : (
                                  <span className="text-xs sm:text-sm text-slate-400">Chưa cập nhật</span>
                                )}
                              </div>
                            </div>

                            {/* TikTok */}
                            <div className="flex items-center gap-3.5 p-1 rounded-xl">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                                <TikTokIcon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted font-medium">TikTok</p>
                                {tiktokUrl ? (
                                  <a
                                    href={tiktokUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs sm:text-sm font-semibold text-primary hover:underline truncate block"
                                  >
                                    {tiktokUrl}
                                  </a>
                                ) : (
                                  <span className="text-xs sm:text-sm text-slate-400">Chưa cập nhật</span>
                                )}
                              </div>
                            </div>

                            {/* LinkedIn */}
                            <div className="flex items-center gap-3.5 p-1 rounded-xl">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                <Linkedin className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted font-medium">LinkedIn</p>
                                {linkedinUrl ? (
                                  <a
                                    href={linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs sm:text-sm font-semibold text-primary hover:underline truncate block"
                                  >
                                    {linkedinUrl}
                                  </a>
                                ) : (
                                  <span className="text-xs sm:text-sm text-slate-400">Chưa cập nhật</span>
                                )}
                              </div>
                            </div>

                            {/* YouTube */}
                            {youtubeUrl && (
                              <div className="flex items-center gap-3.5 p-1 rounded-xl">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                  <Youtube className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-muted font-medium">YouTube</p>
                                  <a
                                    href={youtubeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs sm:text-sm font-semibold text-primary hover:underline truncate block"
                                  >
                                    {youtubeUrl}
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Facebook */}
                            {facebookUrl && (
                              <div className="flex items-center gap-3.5 p-1 rounded-xl">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                  <Facebook className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-muted font-medium">Facebook</p>
                                  <a
                                    href={facebookUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs sm:text-sm font-semibold text-primary hover:underline truncate block"
                                  >
                                    {facebookUrl}
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* EDIT MODE (FORM) */
                      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
                        {/* Card 1: Main Form Fields Card */}
                        <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-5">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <h3 className="text-base font-bold text-heading">Chỉnh sửa thông tin</h3>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="text-xs font-semibold text-muted hover:text-heading transition"
                            >
                              Huỷ chỉnh sửa
                            </button>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                              id="familyName"
                              label="Họ và Tên lót"
                              autoComplete="family-name"
                              placeholder="Nguyễn Nhật"
                              value={familyName}
                              onChange={(e) => setFamilyName(e.target.value)}
                              error={fieldErrors.familyName}
                              disabled={saving}
                            />
                            <FormField
                              id="givenName"
                              label="Tên"
                              autoComplete="given-name"
                              placeholder="Thiên"
                              value={givenName}
                              onChange={(e) => {
                                setGivenName(e.target.value);
                                if (fieldErrors.givenName) {
                                  setFieldErrors((prev) => ({ ...prev, givenName: "" }));
                                }
                              }}
                              onBlur={() => {
                                if (!givenName.trim()) {
                                  setFieldErrors((prev) => ({ ...prev, givenName: "Vui lòng nhập tên của bạn" }));
                                }
                              }}
                              error={fieldErrors.givenName}
                              disabled={saving}
                              required
                            />
                          </div>

                          <FormField
                            id="headline"
                            label="Chức danh / Tiêu đề nghề nghiệp"
                            placeholder="Full-stack Developer & AI Enthusiast"
                            value={headline}
                            onChange={(e) => setHeadline(e.target.value)}
                            error={fieldErrors.headline}
                            disabled={saving}
                          />

                          {/* Custom Handle (URL Slug) Field like Facebook */}
                          <div className="space-y-1.5">
                            <label htmlFor="customHandle" className="text-xs font-semibold text-heading sm:text-sm">
                              Đường dẫn trang cá nhân (URL tùy chỉnh)
                            </label>
                            <div
                              className={cn(
                                "flex items-center rounded-xl border bg-white overflow-hidden transition focus-within:ring-1",
                                fieldErrors.customHandle
                                  ? "border-rose-500 ring-1 ring-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500"
                                  : "border-[#D8E1ED] focus-within:border-primary focus-within:ring-primary"
                              )}
                            >
                              <span className="bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-500 border-r border-[#D8E1ED] select-none shrink-0">
                                edualto.vercel.app/profile/
                              </span>
                              <input
                                id="customHandle"
                                type="text"
                                value={customHandle}
                                onChange={(e) => {
                                  setCustomHandle(e.target.value);
                                  if (fieldErrors.customHandle) {
                                    setFieldErrors((prev) => ({ ...prev, customHandle: "" }));
                                  }
                                }}
                                onBlur={() => {
                                  const trimmed = customHandle.trim();
                                  if (trimmed) {
                                    const handle = trimmed.toLowerCase();
                                    if (!/^[a-z0-9._-]{3,30}$/.test(handle)) {
                                      setFieldErrors((prev) => ({
                                        ...prev,
                                        customHandle: "Đường dẫn chỉ được chứa chữ thường không dấu (a-z), số (0-9) và dấu ., _ hoặc - (từ 3-30 ký tự)"
                                      }));
                                    }
                                  }
                                }}
                                placeholder="nguyennhatthien"
                                disabled={saving}
                                className="w-full bg-transparent px-3 py-2 text-sm text-heading placeholder:text-[#8A9AB3] outline-none"
                              />
                            </div>
                            {fieldErrors.customHandle ? (
                              <p className="text-xs font-medium text-rose-600">{fieldErrors.customHandle}</p>
                            ) : (
                              <p className="text-[11px] text-muted">
                                Tùy chỉnh link hồ sơ cá nhân (3-30 ký tự, chữ thường không dấu, số, dấu ., _ hoặc -).
                              </p>
                            )}
                          </div>

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
                            <CustomSelect
                              id="language"
                              value={language}
                              onChange={setLanguage}
                              options={languageOptions}
                              disabled={saving}
                              className="w-full"
                              buttonClassName="w-full py-3 px-3.5 text-sm font-normal"
                              menuClassName="w-full"
                            />
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
                        </div>

                        {/* Card 3: Social Links Card */}
                        <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
                          <h3 className="text-base font-bold text-heading">Mạng xã hội & Liên kết</h3>

                          <div className="space-y-4">
                            <FormField
                              id="websiteUrl"
                              label="Website cá nhân"
                              type="url"
                              placeholder="https://nteelab.vercel.app/"
                              value={websiteUrl}
                              onChange={(e) => {
                                setWebsiteUrl(e.target.value);
                                if (fieldErrors.websiteUrl) {
                                  setFieldErrors((prev) => ({ ...prev, websiteUrl: "" }));
                                }
                              }}
                              onBlur={() => {
                                if (websiteUrl.trim() && !/^https?:\/\//i.test(websiteUrl.trim())) {
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    websiteUrl: "Đường dẫn website phải bắt đầu bằng http:// hoặc https://"
                                  }));
                                }
                              }}
                              error={fieldErrors.websiteUrl}
                              disabled={saving}
                            />
                            <FormField
                              id="tiktokUrl"
                              label="TikTok"
                              placeholder="https://tiktok.com/@yourprofile"
                              value={tiktokUrl}
                              onChange={(e) => {
                                setTiktokUrl(e.target.value);
                                if (fieldErrors.tiktokUrl) {
                                  setFieldErrors((prev) => ({ ...prev, tiktokUrl: "" }));
                                }
                              }}
                              onBlur={() => {
                                if (tiktokUrl.trim() && !/^https?:\/\//i.test(tiktokUrl.trim())) {
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    tiktokUrl: "Đường dẫn TikTok phải bắt đầu bằng http:// hoặc https://"
                                  }));
                                }
                              }}
                              error={fieldErrors.tiktokUrl}
                              disabled={saving}
                            />
                            <FormField
                              id="linkedinUrl"
                              label="LinkedIn"
                              placeholder="https://www.linkedin.com/in/tee21/"
                              value={linkedinUrl}
                              onChange={(e) => setLinkedinUrl(e.target.value)}
                              error={fieldErrors.linkedinUrl}
                              disabled={saving}
                            />
                            <FormField
                              id="youtubeUrl"
                              label="Kênh YouTube"
                              placeholder="https://youtube.com/@yourchannel"
                              value={youtubeUrl}
                              onChange={(e) => setYoutubeUrl(e.target.value)}
                              error={fieldErrors.youtubeUrl}
                              disabled={saving}
                            />
                            <FormField
                              id="facebookUrl"
                              label="Facebook cá nhân"
                              placeholder="https://facebook.com/yourprofile"
                              value={facebookUrl}
                              onChange={(e) => setFacebookUrl(e.target.value)}
                              error={fieldErrors.facebookUrl}
                              disabled={saving}
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                            <button
                              type="submit"
                              disabled={saving}
                              className="focus-ring inline-flex items-center justify-center rounded-xl bg-primary px-7 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-dark disabled:opacity-50"
                            >
                              {saving ? "Đang lưu..." : "Cập nhật"}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="focus-ring inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-heading shadow-xs transition hover:bg-slate-50"
                            >
                              Huỷ
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </>
                )}

                {/* TAB 2: Giảng viên (Exact Figma Node 33-7705: My Teachers View) */}
                {activeTab === "instructor" && (
                  <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                    {/* Header: Title */}
                    <div>
                      <h2 className="text-xl font-bold text-primary">
                        Giảng Viên <span className="text-sm font-semibold">({filteredAndSortedTeachers.length})</span>
                      </h2>
                    </div>

                    {/* Search and Sort/Filter Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      {/* Search Input */}
                      <div className="relative flex-1 max-w-sm">
                        <input
                          type="text"
                          value={teacherSearch}
                          onChange={(e) => {
                            setTeacherSearch(e.target.value);
                            setTeacherPage(1);
                          }}
                          placeholder="Tìm kiếm giảng viên..."
                          className="w-full rounded-xl border border-[#D8E1ED] bg-white py-2.5 pl-3.5 pr-10 text-sm text-heading placeholder:text-[#8A9AB3] outline-none transition duration-150 hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        <Search className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      </div>

                      {/* Sort & Filter controls */}
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="flex items-center gap-2 text-xs font-semibold text-heading sm:text-sm">
                          <span className="text-muted text-xs">Xếp theo</span>
                          <CustomSelect
                            value={teacherSort}
                            onChange={(val) => {
                              setTeacherSort(val);
                              setTeacherPage(1);
                            }}
                            options={teacherSortOptions}
                            align="right"
                            buttonClassName="py-2 px-3 text-xs sm:text-sm font-semibold"
                            aria-label="Sắp xếp danh sách giảng viên"
                          />
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
                    {filteredAndSortedTeachers.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-sm font-medium text-slate-500">
                          Không tìm thấy giảng viên phù hợp với từ khóa &ldquo;{teacherSearch}&rdquo;.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 pt-1">
                        {filteredAndSortedTeachers
                          .slice((teacherPage - 1) * 8, teacherPage * 8)
                          .map((teacher, idx) => (
                            <div
                              key={`${teacher.id}-${idx}`}
                              className="group flex flex-col items-center rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
                            >
                              <div className="relative h-[150px] w-full overflow-hidden rounded-xl bg-slate-100">
                                <img
                                  src={teacher.image}
                                  alt={teacher.name}
                                  className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
                                />
                              </div>
                              <h3 className="mt-3.5 text-center text-sm font-bold text-heading line-clamp-1">
                                {teacher.name}
                              </h3>
                              <p className="mt-1 text-center text-xs text-muted line-clamp-1 font-medium">
                                {teacher.role}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleMessageTeacher(teacher.name)}
                                className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-dark active:scale-[0.98]"
                              >
                                <span>Gửi Tin Nhắn</span>
                                <Mail className="h-4 w-4 stroke-[2]" />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Centered Pagination matching user request */}
                    {filteredAndSortedTeachers.length > 8 && (
                      <div className="relative flex items-center justify-center pt-6 border-t border-slate-100">
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
                          {Array.from({
                            length: Math.ceil(filteredAndSortedTeachers.length / 8)
                          }).map((_, i) => {
                            const page = i + 1;
                            return (
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
                            );
                          })}
                          <button
                            type="button"
                            onClick={() =>
                              setTeacherPage((p) =>
                                Math.min(
                                  Math.ceil(filteredAndSortedTeachers.length / 8),
                                  p + 1
                                )
                              )
                            }
                            disabled={
                              teacherPage ===
                              Math.ceil(filteredAndSortedTeachers.length / 8)
                            }
                            aria-label="Trang sau"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
                          >
                            &gt;
                          </button>
                        </div>

                        {/* Decorative Dot Grid */}
                        <div
                          className="absolute right-0 hidden sm:grid grid-cols-6 gap-2 opacity-25"
                          aria-hidden="true"
                        >
                          {Array.from({ length: 18 }).map((_, i) => (
                            <span
                              key={i}
                              className="h-1.5 w-1.5 rounded-full bg-slate-400"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
              </section>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <FeedbackModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        description={modalConfig.description}
        tone={modalConfig.tone}
        confirmText={modalConfig.confirmText}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
