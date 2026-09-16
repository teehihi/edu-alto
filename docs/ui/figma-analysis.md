# Figma Analysis

Nguồn Figma:

- Prototype: `https://www.figma.com/proto/Mlwe9OM53EmV87ZBap73zn/EduAlto?node-id=0-1`
- Dev mode: `https://www.figma.com/design/Mlwe9OM53EmV87ZBap73zn/EduAlto?node-id=0-1&m=dev`

## Repository/Figma inspection notes

File có hai page chính: `User Interface` và `Element`. Page `User Interface` chứa frame `Home`, khu vực course detail/review, chatbot và một todo item mẫu. `Element` có khả năng là page component library. Root node `0:1` không trả được design context trực tiếp, vì vậy foundation đã inspect metadata và lấy design context theo section nhỏ: hero/header, feature section và course cards.

## Visual direction

EduAlto có phong cách clean, friendly, education-oriented. Màu chủ đạo là xanh mint `#20B486`, kết hợp nền trắng, text đậm gần navy, muted gray và các accent nhẹ. UI không theo hướng AI/neon/futuristic.

## Screens and sections observed

- Home page desktop 1440px.
- Header/nav với logo, search input, menu `Trang chủ`, `Khóa học`, `Về chúng tôi`, `Liên hệ`, link đăng nhập và CTA tạo tài khoản.
- Hero với H1 lớn, primary/secondary CTA, ba benefit item, avatar/hero image, stat cards và partner logos.
- Feature cards: `Khóa Học Đa Dạng`, `Bài Học Trực Tuyến`, `Kiểm Tra & Đánh Giá`.
- Popular courses section với card course, image, duration badge, category, title, description, rating, instructor và price.
- Footer có logo, supporting text, link columns và social icons.
- Course detail/instructor information.
- Reviews/rating distribution.
- Chatbot UI `Alto Bot` gồm message bubbles, close/action icon, input và send button.

## Reusable components

- AppHeader
- SearchInput
- Button
- FeatureCard
- CourseCard
- RatingStars
- AvatarLabel
- SectionHeading
- Footer
- ChatWidget
- Badge/DurationBadge
- Toast/Skeleton/Dialog foundation cho behavior chưa có trong Figma.

## Design tokens

```text
color.primary = #20B486
color.primaryDark = #1A906B
color.heading = #101A2C
color.textStrong = #101828
color.textMuted = #667085
color.bodyMuted = #646464
color.footer = #F5FBF9
color.footerSecondary = #EAF7F3
color.footerDivider = #DDEFE9
color.featureYellow = #F5C34D
color.featureCoral = #F4866D
color.featureRose = #C77A9A
radius.button = 8px
radius.card = 8px
radius.featureCard = 12px
shadow.xs = 0 1px 2px rgba(16, 24, 40, 0.05)
shadow.lg = 0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)
```

Typography observed:

- Font: Inter.
- Body: 16px/24px regular.
- Small semibold: 14px/20px.
- Hero: 60px/82px bold desktop.
- Section heading: 36px/44px semibold.
- Course title: 24px/32px semibold.

## Responsive observations

Figma context primarily shows desktop. Mobile/tablet behavior is not fully specified. Implementation foundation must define:

- Header collapses to mobile menu.
- Search becomes full-width below nav or hidden behind action.
- Hero becomes one-column, visual stats stack below content.
- Course cards move from 3 columns to 2 columns tablet and 1 column mobile.
- Footer columns stack on mobile.

## Interaction not described by Figma

Figma is static. It does not fully describe:

- Hover/active/focus states for nav, buttons, cards.
- Loading and disabled button states.
- Search dropdown behavior.
- Mobile menu open/close.
- Toast behavior.
- Modal/dialog behavior.
- Form validation behavior.
- Chatbot open/close and send interaction.
- Course favorite/save/add-to-cart states.

## Interaction decisions for foundation

- Button supports `default`, `secondary`, `outline`, `ghost`, `loading`, `disabled`.
- Course card lifts slightly on hover, image subtly scales, arrow moves by 2px.
- Focus-visible ring uses primary color with soft mint outline.
- Mobile nav uses accessible disclosure button with `aria-expanded`.
- Skeleton, empty and error components are prepared for future data fetching.
- Motion stays subtle: 150-220ms transitions, no flashy effects.

## Ambiguities

- Exact mobile layouts are not provided.
- Some Figma generated assets are short-lived remote URLs, so committed code should use local assets or stable product assets.
- Hero student image in Figma appears custom and is not present in repo; foundation uses existing EduAlto logo assets and CSS illustration placeholders until stable media assets are supplied.
- Payment/order screens are not visible in the inspected node, so e-commerce behavior remains architecture-level only.
