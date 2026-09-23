"use client";

import {
  Building2,
  CheckCircle2,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Send,
  Twitter,
  Youtube
} from "lucide-react";
import React, { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { FeedbackModal } from "@/components/ui/feedback-modal";

export function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submittedModalOpen, setSubmittedModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = "Vui lòng nhập họ và tên của bạn";
    }
    if (!email.trim()) {
      errors.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Email không đúng định dạng";
    }
    if (!message.trim()) {
      errors.message = "Vui lòng nhập nội dung lời nhắn";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    // Simulate sending contact message
    await new Promise((resolve) => setTimeout(resolve, 600));

    setLoading(false);
    setSubmittedModalOpen(true);
    setFullName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5FBF9] text-ink antialiased">
      <AppHeader />

      <main className="relative flex-1 py-12 lg:py-20 overflow-hidden">
        {/* ========================================================= */}
        {/* DECORATIVE BACKGROUND ELEMENTS (Matching Figma Design) */}
        {/* ========================================================= */}
        {/* Top-Right Dot Grid */}
        <div
          className="pointer-events-none absolute right-8 top-12 hidden grid-cols-6 gap-3 opacity-25 lg:grid"
          aria-hidden="true"
        >
          {Array.from({ length: 36 }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-primary" />
          ))}
        </div>

        {/* Bottom-Left Overlapping Green Squares */}
        <div
          className="pointer-events-none absolute bottom-12 left-8 hidden lg:block opacity-40"
          aria-hidden="true"
        >
          <div className="relative h-28 w-28">
            <div className="absolute inset-0 rounded-2xl border-2 border-primary" />
            <div className="absolute left-6 top-6 h-28 w-28 rounded-2xl border-2 border-primary/70" />
          </div>
        </div>

        {/* Bottom-Right Overlapping Orange Squares */}
        <div
          className="pointer-events-none absolute bottom-16 right-10 hidden lg:block opacity-40"
          aria-hidden="true"
        >
          <div className="relative h-28 w-28">
            <div className="absolute inset-0 rounded-2xl border-2 border-[#F5C34D]" />
            <div className="absolute -left-6 -top-6 h-28 w-28 rounded-2xl border-2 border-[#F4866D]" />
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN CONTACT CARD */}
        {/* ========================================================= */}
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl sm:p-10 lg:p-12">
            {/* Title */}
            <div className="text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl lg:text-4xl">
                Kết Nối Với EduAlto
              </h1>
              <p className="mt-2 text-sm text-muted">
                Chúng tôi luôn sẵn sàng lắng nghe câu hỏi, đóng góp ý kiến và hỗ trợ bạn trong suốt hành trình học tập.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Left Column: Form */}
              <div className="lg:col-span-7">
                <h2 className="text-base font-bold text-heading">
                  Để lại lời nhắn cho chúng tôi
                </h2>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Họ và Tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Nhật Thiên"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-heading shadow-2xs placeholder:text-slate-400 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    />
                    {fieldErrors.fullName && (
                      <p className="mt-1 text-xs text-rose-500">{fieldErrors.fullName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="toahith@vng.com.vn"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-heading shadow-2xs placeholder:text-slate-400 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-rose-500">{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Lời nhắn của bạn... <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Nhập nội dung thắc mắc hoặc câu hỏi cần giải đáp..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-heading shadow-2xs placeholder:text-slate-400 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    />
                    {fieldErrors.message && (
                      <p className="mt-1 text-xs text-rose-500">{fieldErrors.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      loading={loading}
                      className="w-full rounded-xl bg-primary py-3 font-bold text-white shadow-xs transition hover:bg-primary-dark active:scale-[0.98]"
                    >
                      <span>Send</span>
                    </Button>
                  </div>
                </form>
              </div>

              {/* Right Column: Contact Info & Map */}
              <div className="flex flex-col justify-between border-t border-slate-100 pt-8 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <div className="space-y-4 text-xs sm:text-sm text-slate-700">
                  <div>
                    <h3 className="font-bold text-heading">EduAlto LMS</h3>
                    <div className="mt-2.5 flex items-start gap-2.5 text-muted">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>
                        HCM-UTE, 01 Võ Văn Ngân, phường Linh Chiểu, thành phố Thủ Đức, TP. Hồ Chí Minh
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-muted">
                    <Phone className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium text-heading">+84 931.65.2105</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-muted">
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium text-heading">vanhau123w@gmail.com</span>
                  </div>

                  {/* Social Media Links */}
                  <div className="flex items-center gap-3 pt-2">
                    <a
                      href="https://youtube.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="YouTube"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Youtube className="h-4 w-4" />
                    </a>
                    <a
                      href="https://instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-pink-50 hover:text-pink-600"
                    >
                      <Instagram className="h-4 w-4" />
                    </a>
                    <a
                      href="https://facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Facebook className="h-4 w-4" />
                    </a>
                    <a
                      href="https://twitter.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Twitter"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-sky-50 hover:text-sky-600"
                    >
                      <Twitter className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                {/* Map View */}
                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 shadow-2xs">
                  <iframe
                    title="Bản đồ vị trí Trường Đại học Sư phạm Kỹ thuật TP.HCM"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.4854676515286!2d106.769338175704!3d10.85063238930268!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752763f23816ab%3A0x282f7110ecd96923!2zVHLGsOG7nW5nIMSQ4bqhaSBo4buNYyBTxrAgcGjhuqFtIEvhu7kgdGh14bqtdCBUaMOgbmggcGjhu5EgSOG7kyBDaMOtIE1pbmg!5e0!3m2!1svi!2s!4v1716300000000!5m2!1svi!2s"
                    width="100%"
                    height="180"
                    style={{ border: 0 }}
                    allowFullScreen={false}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      <FeedbackModal
        isOpen={submittedModalOpen}
        onClose={() => setSubmittedModalOpen(false)}
        title="Đã gửi lời nhắn thành công!"
        description="Cảm ơn bạn đã kết nối với EduAlto. Đội ngũ hỗ trợ của chúng tôi sẽ phản hồi lại bạn qua email trong thời gian sớm nhất."
        tone="success"
        confirmText="Đã hiểu"
      />

      <Footer />
    </div>
  );
}
