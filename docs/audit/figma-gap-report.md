# EduAlto Figma Gap Report - RUN #2

Ngày audit: 2026-09-16  
Nguồn chính: `docs/ui/figma-analysis.md` và mã UI hiện tại trong `frontend/src`.  
Lưu ý: Không inspect trực tiếp Figma trong lượt này. Mọi nhận xét về Figma bên dưới chỉ dựa trên tài liệu đã có trong repo, không bịa thêm chi tiết visual ngoài tài liệu.

## Tóm tắt

UI hiện tại đã bám được hướng thiết kế chính của EduAlto: sạch, thân thiện, education-oriented, dùng primary `#20B486`, typography Inter, header, hero, feature cards, popular courses và footer. Đây là nền tảng tốt cho homepage.

Gap lớn nhất là UI hiện tại mới cover homepage demo, chưa cover đầy đủ các phần được `docs/ui/figma-analysis.md` ghi nhận như course detail/instructor information, reviews/rating distribution và chatbot `Alto Bot`. Hero visual cũng đang là CSS placeholder thay vì asset học viên/hero image ổn định từ Figma.

## Evidence từ tài liệu Figma hiện có

`docs/ui/figma-analysis.md` ghi nhận:

- Home page desktop 1440px.
- Header/nav với logo, search input, menu, đăng nhập và CTA tạo tài khoản.
- Hero với H1 lớn, CTA, benefit item, avatar/hero image, stat cards và partner logos.
- Feature cards: `Khóa Học Đa Dạng`, `Bài Học Trực Tuyến`, `Kiểm Tra & Đánh Giá`.
- Popular courses với card course, image, duration badge, category, title, description, rating, instructor và price.
- Footer có logo, supporting text, link columns và social icons.
- Course detail/instructor information.
- Reviews/rating distribution.
- Chatbot UI `Alto Bot`.
- Mobile/tablet chưa được Figma mô tả đầy đủ; implementation phải tự định nghĩa responsive behavior.

## Evidence từ UI hiện tại

- `frontend/src/features/home/home-page.tsx`: có `AppHeader`, hero, CTA, benefit items, stat cards, partner logos, feature section, popular courses section và footer.
- `frontend/src/components/layout/app-header.tsx`: có logo, desktop search, nav, login/register CTA và mobile menu.
- `frontend/src/components/course/course-card.tsx`: có course visual placeholder gradient, duration badge, category, title, description, rating, instructor và price.
- `frontend/src/components/layout/footer.tsx`: có logo, supporting text, link columns và copyright.
- `frontend/tailwind.config.ts`: design tokens khớp phần lớn với `docs/ui/figma-analysis.md`.
- Không thấy component/page cho `ChatWidget`, course detail, instructor info detail, rating distribution/reviews page.

## Gap findings

### HIGH-01: Chưa có course detail/review UI được tài liệu Figma ghi nhận

- Problem: Tài liệu Figma ghi có course detail/instructor information và reviews/rating distribution, nhưng repo hiện chỉ có homepage và course card.
- Evidence: `docs/ui/figma-analysis.md` liệt kê course detail/instructor/reviews; `frontend/src/app` chỉ có `page.tsx` và `layout.tsx`; không thấy route/course detail component trong `frontend/src`.
- Impact: Nếu RUN #2 yêu cầu parity với các screen đã inspect, UI hiện chưa đủ coverage để review flow học viên xem chi tiết khóa học.
- Recommendation: Tạo scope rõ: nếu RUN #2 chỉ homepage thì ghi backlog; nếu yêu cầu Figma coverage thì thêm route chi tiết khóa học, instructor summary, reviews/rating distribution và empty/loading states tiếng Việt.
- Priority: HIGH.
- Must fix in RUN #2: Có nếu course detail thuộc scope RUN #2; không nếu scope chỉ homepage foundation.

### HIGH-02: Chưa có chatbot `Alto Bot`

- Problem: Figma analysis ghi nhận chatbot UI nhưng implementation chưa có component chat.
- Evidence: Không thấy `ChatWidget` hoặc component tương đương trong `frontend/src`; homepage không render chat.
- Impact: Mất một phần UI nổi bật được ghi trong tài liệu Figma. Nếu AI/chat là extension tương lai, cần tránh hiểu nhầm rằng RUN #2 đã implement.
- Recommendation: Hoặc bổ sung `ChatWidget` foundation với trạng thái đóng/mở/input/send disabled, hoặc ghi rõ chatbot không thuộc RUN #2 và để backlog.
- Priority: HIGH.
- Must fix in RUN #2: Có nếu RUN #2 yêu cầu toàn bộ UI Figma đã inspect; không nếu chatbot là future extension.

### MEDIUM-01: Hero image/avatar chưa dùng asset ổn định từ Figma

- Problem: Hero hiện dùng minh họa CSS hình tròn/chữ EduAlto, không phải avatar/hero image như tài liệu Figma ghi nhận.
- Evidence: `frontend/src/features/home/home-page.tsx` dựng hero visual bằng div absolute và text; `docs/ui/figma-analysis.md` ghi "avatar/hero image" và cũng nêu asset Figma có thể short-lived nên cần stable product assets.
- Impact: Visual first impression lệch Figma và kém cụ thể về sản phẩm/người học.
- Recommendation: Khi có asset ổn định, đưa vào `public/images` và thay placeholder; nếu chưa có, ghi rõ placeholder được chấp nhận tạm thời.
- Priority: MEDIUM.
- Must fix in RUN #2: Nên fix nếu demo visual theo Figma là mục tiêu chính.

### MEDIUM-02: Footer thiếu social icons được tài liệu Figma ghi nhận

- Problem: Footer hiện có logo, text, link columns và copyright, nhưng không có social icons.
- Evidence: `docs/ui/figma-analysis.md` ghi footer có social icons; `frontend/src/components/layout/footer.tsx` không render social icons.
- Impact: Footer chưa parity với Figma homepage.
- Recommendation: Bổ sung social icon group bằng lucide hoặc asset ổn định, có accessible labels tiếng Việt.
- Priority: MEDIUM.
- Must fix in RUN #2: Nên fix nếu homepage parity là tiêu chí approve.

### MEDIUM-03: Course card visual dùng gradient placeholder thay vì hình khóa học

- Problem: Tài liệu Figma ghi course card có image; implementation dùng gradient/accent block.
- Evidence: `frontend/src/components/course/course-card.tsx` tạo `bg-gradient-to-br`; không dùng `Image`.
- Impact: Card không thể hiện trực quan nội dung khóa học như Figma, dễ tạo cảm giác demo.
- Recommendation: Thêm trường image/alt vào course type và dùng local stable assets; nếu chưa có asset, document placeholder rõ ràng.
- Priority: MEDIUM.
- Must fix in RUN #2: Nên fix nếu UI homepage cần bám Figma.

### MEDIUM-04: Responsive đã có nhưng chưa có visual QA bằng screenshot

- Problem: Figma mobile/tablet chưa được mô tả đầy đủ, implementation tự quyết định responsive nhưng chưa có evidence visual QA trong repo.
- Evidence: `AppHeader` có mobile menu; grid homepage dùng breakpoint Tailwind; không có screenshot/test visual trong docs/audit hoặc test.
- Impact: Có rủi ro hero stat cards/partner logos/course cards bị chật hoặc lệch ở mobile mà audit text không bắt hết.
- Recommendation: Chạy dev server và chụp screenshot mobile/tablet/desktop trong lượt implementation tiếp theo; ghi kết quả vào audit hoặc visual QA doc.
- Priority: MEDIUM.
- Must fix in RUN #2: Không bắt buộc nếu RUN #2 không yêu cầu visual QA artifact; nên làm trước demo.

### LOW-01: Một số CTA/link chưa có destination thật

- Problem: Nhiều link dùng `#`, ví dụ nav/footer/login.
- Evidence: `frontend/src/components/layout/app-header.tsx`, `frontend/src/components/layout/footer.tsx`.
- Impact: UI trông hoàn chỉnh nhưng interaction chưa hoàn chỉnh.
- Recommendation: Dùng route thật khi có page, hoặc state "sắp ra mắt" tiếng Việt nếu chưa thuộc scope.
- Priority: LOW.
- Must fix in RUN #2: Không bắt buộc.

## Coverage matrix

| Figma item từ tài liệu | UI hiện tại | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| Header/logo/nav/search/auth CTA | `AppHeader` | PASS | Có desktop và mobile menu. |
| Hero H1/CTA/benefit/stat cards | `HomePage` | PARTIAL | Có cấu trúc chính, nhưng hero image là placeholder CSS. |
| Partner logos | `HomePage` | PARTIAL | Có text partner, chưa xác nhận visual parity/logo assets. |
| Feature cards | `FeatureCard` + constants | PASS | Copy tiếng Việt và 3 card đúng ý chính. |
| Popular courses | `CourseCard` | PARTIAL | Có metadata chính, image đang là gradient placeholder. |
| Footer logo/text/link columns | `Footer` | PARTIAL | Thiếu social icons. |
| Course detail/instructor info | Không thấy | FAIL | Chưa có route/component. |
| Reviews/rating distribution | Không thấy | FAIL | Chưa có component. |
| Chatbot `Alto Bot` | Không thấy | FAIL | Chưa có component. |
| Toast/skeleton/dialog foundation | `Skeleton`, `EmptyState`, `Button` | PARTIAL | Có vài UI foundation; chưa thấy toast/dialog. |
| Mobile/tablet behavior | Tailwind responsive + mobile menu | PARTIAL | Chưa có screenshot QA. |

## Kết luận

Homepage foundation đang đi đúng hướng và giữ được ngôn ngữ hình ảnh EduAlto, nhưng chưa đủ để gọi là Figma parity rộng theo toàn bộ các section đã được tài liệu ghi nhận. Trước khi approve RUN #2 theo tiêu chí UI, cần xác định scope: nếu chỉ homepage thì fix các gap MEDIUM về hero/course/footer; nếu gồm toàn bộ Figma-inspected UI thì cần bổ sung course detail, review/rating distribution và chatbot.

