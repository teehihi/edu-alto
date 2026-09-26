"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import React, { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";

interface BenefitItem {
  id: string;
  number: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  highlightBg?: boolean;
}

const BENEFIT_ITEMS: BenefitItem[] = [
  {
    id: "benefit-1",
    number: "01",
    title: "Học Tập Linh Hoạt",
    shortDesc: "Học mọi lúc, mọi nơi với nền tảng trực tuyến tiện lợi, phù hợp với lịch trình ...",
    fullDesc:
      "Học mọi lúc, mọi nơi với nền tảng trực tuyến tiện lợi, phù hợp với lịch trình cá nhân. Người học có thể chủ động sắp xếp thời gian biểu và học tập theo tiến độ phù hợp nhất.",
  },
  {
    id: "benefit-2",
    number: "02",
    title: "Tiết Kiệm Thời Gian",
    shortDesc: "Dễ dàng tiếp cận bài học và tài liệu trực tuyến, giúp bạn chủ động học ...",
    fullDesc:
      "Dễ dàng tiếp cận bài học và tài liệu trực tuyến, giúp bạn chủ động học tập mọi lúc, tối ưu hóa thời gian thực hành và rút ngắn khoảng cách tiếp cận kiến thức mới.",
  },
  {
    id: "benefit-3",
    number: "03",
    title: "Cá Nhân Hóa Trải Nghiệm",
    shortDesc: "Lựa chọn khóa học và nội dung phù hợp với mục tiêu, nhu cầu và tốc độ ...",
    fullDesc:
      "Lựa chọn khóa học và nội dung phù hợp với mục tiêu, nhu cầu và tốc độ của bản thân. Hệ thống giúp theo dõi tiến độ và đề xuất nội dung tối ưu theo từng học viên.",
    highlightBg: true,
  },
  {
    id: "benefit-4",
    number: "04",
    title: "Chi Phí Hợp Lý",
    shortDesc: "Tiếp cận đa dạng khóa học và tài liệu học tập với mức chi phí phù hợp ...",
    fullDesc:
      "Tiếp cận đa dạng khóa học và tài liệu học tập với mức chi phí phù hợp và minh bạch, mở rộng cơ hội nâng cao trình độ chuyên môn cho mọi đối tượng học viên.",
  },
  {
    id: "benefit-5",
    number: "05",
    title: "Nâng Cao Hiệu Quả Học Tập",
    shortDesc: "Củng cố kiến thức thông qua bài học, bài kiểm tra và các hoạt động ...",
    fullDesc:
      "Củng cố kiến thức thông qua hệ thống bài học chi tiết, bài tập trắc nghiệm và đánh giá thực hành, giúp người học ghi nhớ sâu và ứng dụng hiệu quả vào thực tế.",
  },
  {
    id: "benefit-6",
    number: "06",
    title: "Tài Liệu Đa Dạng",
    shortDesc: "Kết hợp nhiều dạng nội dung học tập trực quan, giúp việc tiếp thu kiến ...",
    fullDesc:
      "Kết hợp nhiều dạng nội dung học tập trực quan gồm văn bản chuyên sâu, slide bài giảng, code mẫu và tài liệu tham khảo phong phú, mang đến trải nghiệm học tập sinh động.",
  },
];

export function AboutPage() {
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitItem | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#101A2C] antialiased">
      <AppHeader />

      <main className="flex-1 pb-16">
        {/* ========================================================= */}
        {/* SECTION 1: HERO ABOUT (Exact Figma Scale & Proportions) */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden pt-10 pb-16 lg:pt-14 lg:pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-12 xl:gap-16">
              {/* Left Column: Typography */}
              <div className="lg:col-span-7 space-y-6 sm:space-y-7">
                <div className="space-y-3">
                  <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-[#20B486] leading-[1.1]">
                    Về Chúng Tôi
                  </h1>
                  <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold tracking-tight text-[#101A2C] leading-[1.25]">
                    <span className="text-[#20B486]">EDUALTO</span> – NỀN TẢNG HỌC
                    <br />
                    TẬP TRỰC TUYẾN
                  </h2>
                </div>

                {/* Plain Paragraph directly on white background matching Figma */}
                <div className="space-y-3 text-sm sm:text-base leading-[1.75] text-[#475467] max-w-[560px]">
                  <p>
                    EduAlto được xây dựng với mong muốn mang đến một môi trường học tập trực tuyến
                    tiện dụng, nơi mọi người học có thể dễ dàng tiếp cận kiến thức, phát triển kỹ
                    năng và chủ động trên hành trình học tập của mình. EduAlto cung cấp hệ thống
                    khóa học, bài học và tài liệu học tập đa dạng, kết hợp cùng các bài kiểm tra và
                    đánh giá giúp người học củng cố kiến thức. Với giao diện trực quan và trải
                    nghiệm học tập thuận tiện, EduAlto hướng đến việc tạo ra một nền tảng học tập dễ
                    tiếp cận, linh hoạt và hiệu quả.
                  </p>
                  <p>
                    Học tập không chỉ là tiếp thu kiến thức, mà còn là hành trình không ngừng phát
                    triển bản thân.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-2.5 rounded-full bg-[#20B486] px-6 py-3 text-sm font-semibold text-white shadow-xs transition duration-200 hover:bg-[#1ca077] active:scale-[0.98]"
                  >
                    <span>Trải nghiệm ngay</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Right Column: Layered Overlap Composition */}
              <div className="relative lg:col-span-5 flex items-center justify-center lg:justify-end">
                <div className="relative h-[290px] w-[390px] sm:h-[320px] sm:w-[430px]">
                  {/* Background Soft Mint Rounded Container */}
                  <div className="absolute right-0 top-3 h-[240px] w-[300px] sm:h-[260px] sm:w-[330px] rounded-[32px] bg-[#EEF5F2]" />

                  {/* Top Right: Campus Photo with graduation cap */}
                  <div className="absolute right-0 top-0 h-[155px] w-[250px] sm:h-[170px] sm:w-[275px] overflow-hidden rounded-2xl shadow-xs">
                    <Image
                      src="/images/about/hero-campus.png"
                      alt="EduAlto Campus"
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 275px"
                    />
                  </div>

                  {/* Bottom Left: 3 Members Photo overlapping */}
                  <div className="absolute bottom-0 left-0 h-[155px] w-[235px] sm:h-[170px] sm:w-[255px] overflow-hidden rounded-2xl shadow-md border-[3px] border-white">
                    <Image
                      src="/images/about/hero-students.png"
                      alt="Học viên EduAlto"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 255px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: TÍNH NĂNG NỔI BẬT (FEATURE) */}
        {/* ========================================================= */}
        <section className="py-12 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
              {/* Left Column: HCMUTE Campus with background container */}
              <div className="lg:col-span-5 flex justify-center lg:justify-start">
                <div className="relative rounded-[32px] bg-[#EEF5F2] p-4 sm:p-5 shadow-xs">
                  <div className="relative h-[300px] w-[280px] sm:h-[350px] sm:w-[320px] overflow-hidden rounded-2xl shadow-xs">
                    <Image
                      src="/images/about/feature-building.png"
                      alt="Trường Đại học Sư phạm Kỹ thuật TP.HCM"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Content */}
              <div className="lg:col-span-7 space-y-5 sm:space-y-6">
                <div>
                  <span className="text-sm sm:text-base font-bold text-[#20B486]">
                    Tính năng nổi bật
                  </span>
                  <h2 className="mt-2 text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#101A2C] leading-[1.2]">
                    Mang đến trải nghiệm
                    <br />
                    học tập tốt hơn mỗi
                    <br />
                    ngày.
                  </h2>
                </div>

                <div className="space-y-3.5 text-sm sm:text-base leading-[1.75] text-[#475467] max-w-[540px]">
                  <p>
                    EduAlto hướng đến việc giúp người học xác định rõ mục tiêu, duy trì động lực và
                    tự tin trên hành trình phát triển kiến thức, kỹ năng của mình.
                  </p>
                  <p>
                    Ngày nay, bạn có thể dễ dàng tìm thấy vô số thông tin chỉ với một vài cú nhấp
                    chuột. Tuy nhiên, EduAlto tin rằng kiến thức chỉ thực sự có giá trị khi được kết
                    hợp với việc học tập, thực hành và không ngừng phát triển bản thân.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-2.5 rounded-full bg-[#20B486] px-6 py-3 text-sm font-semibold text-white shadow-xs transition duration-200 hover:bg-[#1ca077] active:scale-[0.98]"
                  >
                    <span>Tìm hiểu thêm</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: LỢI ÍCH NỔI BẬT (BENEFITS 3x2 GRID) */}
        {/* ========================================================= */}
        <section className="pt-12 pb-20 lg:pt-16 lg:pb-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Centered Heading */}
            <div className="mx-auto max-w-2xl text-center space-y-2">
              <span className="text-sm sm:text-base font-bold text-[#20B486]">Lợi ích Nổi bật</span>
              <h2 className="text-3xl sm:text-4xl lg:text-[38px] font-extrabold text-[#101A2C] leading-snug">
                Những giá trị EduAlto mang đến
                <br className="hidden sm:inline" /> cho hành trình học tập của bạn.
              </h2>
              <p className="text-sm sm:text-base text-[#667085] leading-relaxed max-w-xl mx-auto pt-1">
                Khám phá những lợi ích thiết thực giúp bạn học tập hiệu quả, phát triển kỹ
                <br className="hidden sm:inline" /> năng và chủ động hơn trên hành trình chinh phục
                kiến thức.
              </p>
            </div>

            {/* 6 Benefit Cards Grid */}
            <div className="mt-12 sm:mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFIT_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className={`group relative flex flex-col justify-between rounded-[20px] border border-[#E7F0EB] p-6 sm:p-7 transition-all duration-300 hover:border-[#20B486]/50 hover:shadow-md ${
                    item.highlightBg ? "bg-[#F3FAF6]" : "bg-[#F9FCFA]"
                  }`}
                >
                  <div>
                    {/* Water-drop shape with number matching Figma */}
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-tl-xl rounded-br-xl bg-[#20B486]/15 text-[#20B486]">
                      <span className="text-sm font-extrabold">{item.number}</span>
                    </div>

                    {/* Title */}
                    <h3 className="mt-4 text-[17px] sm:text-[18px] font-bold text-[#101A2C]">
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-2.5 text-[13px] sm:text-sm leading-relaxed text-[#667085]">
                      {item.shortDesc}{" "}
                      <button
                        type="button"
                        onClick={() => setSelectedBenefit(item)}
                        className="font-semibold text-[#20B486] hover:underline"
                      >
                        Read More
                      </button>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Benefit Detail Modal */}
      {selectedBenefit && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedBenefit(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
            <button
              type="button"
              onClick={() => setSelectedBenefit(null)}
              aria-label="Đóng"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="text-2xl font-extrabold text-[#20B486]">{selectedBenefit.number}</span>
            <h3 className="mt-2 text-xl font-bold text-heading">{selectedBenefit.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {selectedBenefit.fullDesc}
            </p>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBenefit(null)}
                className="rounded-full bg-[#20B486] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#1ca077]"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
