# Kế hoạch triển khai AI trên AWS cho EduAlto

Ngày nghiên cứu: 11/10/2026. Đây là đề xuất để triển khai, chưa phải mô tả tính năng đã phát hành.

## Quyết định đề xuất

Giữ modular monolith Spring Boot trên Lightsail 4 GB RAM, 2 vCPU; PostgreSQL RDS `db.t4g.micro` tại `ap-southeast-2`. **Giữ Gemini API cho chatbot và tạo bài giảng**, vì hai luồng này đang hoạt động tốt; quiz nháp có thể dùng lại Gemini với prompt/schema và bước giảng viên duyệt riêng. Không chuyển các tác vụ sinh nội dung sang Bedrock và không fine-tune LLM khi chưa có lỗi chất lượng, chi phí hoặc điều khoản được chứng minh. AWS credits không thanh toán Gemini API.

Ưu tiên "model tự train" cho **gợi ý bài học/ôn tập cá nhân hóa** dựa trên dữ liệu học của EduAlto. Đây là model nhỏ huấn luyện từ dữ liệu riêng, không cần là LLM. **OCR tiếng Việt** là ứng viên fine-tune thứ hai sau khi có scan thật, nhãn chép đúng và bằng chứng model có sẵn mắc lỗi có hệ thống. Account LMS còn $198 credit, account AI thứ hai hiển thị $200 credit; giữ hai ngân sách tách biệt. **Train trên Google Colab rồi triển khai artifact sang một máy AWS riêng của account AI** là phương án chủ dự án chấp nhận. Máy LMS 4 GB chỉ gọi dịch vụ suy luận; không chứa model OCR/LLM.

Nút tạo quiz bằng AI có thể là tính năng sinh nội dung tiếp theo. Tuy nhiên, trước khi mở AI cho học viên, cần giải quyết điều khoản nhà cung cấp: [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms) hiện nói không dùng dịch vụ trong ứng dụng hướng đến hoặc có khả năng được người dưới 18 tuổi truy cập. EduAlto hỗ trợ cấp tiểu học/trung học, nên đây là rủi ro **High** cần rà soát sản phẩm/điều khoản và chọn provider phù hợp; không mặc định tái sử dụng Gemini cho chatbot học viên. Free Tier Gemini còn nêu dữ liệu gửi lên có thể được dùng cải thiện sản phẩm và được người đánh giá xem, vì vậy không gửi dữ liệu cá nhân hoặc bài làm của học viên lên Free Tier.

**Khuyến nghị chốt theo chi phí và sản phẩm:** làm skill taxonomy, đo phản hồi gợi ý và baseline trước; sau đó train ranker XGBoost trên Colab, so kết quả với baseline. Chỉ làm OCR scan khi có nhu cầu thực, bắt đầu bằng pretrained model và fine-tune trên Colab nếu đo được lợi ích. Dựng máy AWS riêng để phục vụ model khi có chức năng cần suy luận thường xuyên; chọn RAM/CPU theo benchmark thực tế của artifact, không theo kích thước GPU dùng lúc train.

## Trạng thái code thực tế

| Thành phần | Đang có | Còn thiếu |
| --- | --- | --- |
| Chatbot Alto Bot | `ai` module dùng Gemini, FAQ công khai và PostgreSQL full-text search với kiểm tra quyền xem lesson; endpoint `/api/v1/ai/chat`. | Chưa có ngân sách provider bền qua restart/replica; chưa có lựa chọn provider phù hợp cho học viên nhỏ tuổi. |
| Nhập giáo trình | Job chạy nền, đọc DOC/DOCX/PDF dạng text, Gemini tạo bản nháp và giảng viên duyệt trước khi lưu. | Chưa có OCR; worker và nguồn job đang ở bộ nhớ tiến trình nên restart làm job chờ thất bại. |
| Sinh quiz | UI có nút `Tạo bằng AI` nhưng đang disabled; quiz thủ công và chấm điểm đã tồn tại. | Endpoint chỉ tạo **bản nháp** quiz từ bài học nguồn, schema/validation và duyệt của giảng viên. |
| Phân tích kỹ năng / gợi ý | Có lesson progress, quiz attempts, assignment grades, enrollment; tài liệu kiến trúc có sơ đồ bảng dự kiến. | Chưa có migration cho `learning_signals`, skill taxonomy, hồ sơ kỹ năng, recommendation hay API gợi ý. `analytics` mới có metrics cho giảng viên. |
| “Khóa học bạn có thể quan tâm” | Trang chi tiết hiển thị bốn khóa học đầu từ catalog. | Đây chưa phải recommendation cá nhân hóa, và thứ tự hiện tại không dựa trên kỹ năng hoặc hành vi học. |

Các vị trí chính: `backend/src/main/java/com/edualto/ai/`, `backend/src/main/java/com/edualto/analytics/`, `frontend/src/features/instructor/quiz-authoring-fields.tsx`, `frontend/src/features/course/course-detail-page.tsx`, `docs/architecture/ai-extension.md`. Trạng thái này dựa trên **working tree** hiện tại, trong đó nhiều file AI vẫn chưa được commit; chưa xác minh các tính năng đó đã chạy trên production.

## Thứ tự triển khai

| Mức ưu tiên | Tính năng | Cách làm trên máy hiện tại | Model trả phí |
| --- | --- | --- | --- |
| P0 | Thu thập tín hiệu và hồ sơ kỹ năng | SQL/PostgreSQL, tính theo batch và cập nhật một học viên khi dữ liệu cũ; giảng viên gắn skill cho nội dung/câu hỏi. | Không. |
| P1 | Gợi ý bài học tiếp theo / ôn tập | Ứng viên được lọc theo quyền học và trạng thái xuất bản; xếp hạng bằng điểm có trọng số, lưu lý do cụ thể. Khi đủ nhãn, huấn luyện ranker từ tín hiệu học tập và phản hồi. | Không cần LLM. |
| P1 | Gợi ý khóa học | Dùng mục tiêu học viên, skill thiếu, chủ đề đã học; loại khóa đã mua/ẩn/chưa xuất bản. Khách chưa đăng nhập thấy khóa liên quan theo taxonomy. Cùng ranker khi đủ dữ liệu. | Không cần LLM. |
| P2 | Tạo quiz nháp cho giảng viên | Dùng Gemini như chatbot/tạo bài giảng hiện tại, nhưng prompt/schema riêng; giảng viên duyệt trước khi lưu. | Gemini API, ngoài AWS credits. |
| P3 | OCR scan tiếng Việt | Thử model OCR pretrained, giảng viên sửa text; fine-tune khi có ảnh + bản chép đúng và lỗi lặp lại. | CPU/GPU tạm thời khi cần. |
| Sau dữ liệu thực tế | Dự báo bỏ học hoặc tự chấm bài tự luận | Cần bộ dữ liệu đủ lớn, đánh giá sai lệch và quy trình can thiệp/duyệt; chưa ưu tiên. | Chưa quyết định. |

### P0: tín hiệu và kỹ năng

1. Tạo `skills` và bảng gắn skill với `course`, `lesson`, `quiz_question` (hoặc bảng mapping theo owner đã thống nhất). Giảng viên được chọn skill từ taxonomy và chỉnh sửa; gắn nhãn AI chỉ là đề xuất chờ duyệt. `quiz_attempt_answers` hiện đã có `is_correct` cho từng câu, nhưng `quiz_questions` chưa gắn skill; đây là khoảng trống trước khi ước lượng thành thạo.
2. Tạo `learning_signals` append-only cho `LESSON_COMPLETED`, `QUIZ_SUBMITTED`, `ASSIGNMENT_GRADED`. Ghi `event_id/source_id`, `user_id`, `course_id`, `lesson_id`, thời gian, điểm số tối thiểu cần thiết; dùng unique key để xử lý retry/idempotency. Không lưu nội dung bài làm, prompt hoặc email trong metadata. Chỉ phát tín hiệu sau khi transaction nghiệp vụ thành công và có job đối soát từ bảng nguồn để sửa trường hợp mất event.
3. `analytics` tính hồ sơ kỹ năng theo dữ liệu có bằng chứng. Quiz/assignment gắn skill mới tăng/giảm mức thành thạo; hoàn thành lesson chỉ chứng minh đã học, không tự coi là đã giỏi. Trả `level`, `confidence`, `evidence_count`, `updated_at`; ít dữ liệu thì trả “Chưa đủ dữ liệu”. Dùng snapshot trong PostgreSQL, không tính lại toàn bộ mỗi lần mở trang. Sau khi có chuỗi câu trả lời theo cùng kỹ năng đủ dày, có thể hiệu chỉnh model knowledge tracing/BKT và so độ chính xác dự đoán câu tiếp theo với thống kê cơ bản.
4. Giữ ranh giới module: `learning/quiz/assignment` chỉ phát tín hiệu qua `LearningSignalPublisher`; `analytics` sở hữu tổng hợp; `ai` sở hữu điểm xếp hạng/recommendation. Course service không gọi model hoặc recommendation service. Có lựa chọn không tham gia cá nhân hóa, thời hạn giữ tín hiệu thô và xóa/đối soát khi học viên xóa tài khoản trước khi mở production.

### P1: recommendation có lý do

- Sinh ứng viên bằng SQL giới hạn: bài tiếp theo trong khóa đang học, bài cần ôn theo skill còn yếu, khóa đã xuất bản liên quan tới mục tiêu học. Lọc quyền trước khi xếp hạng và kiểm tra lại khi trả API. Tránh dùng câu hỏi/đáp án quiz làm nguồn cho học viên.
- Baseline ban đầu: bài tiếp theo trong lộ trình và bài ôn cho skill còn yếu, có lý do cụ thể. Nếu dùng trọng số, coi là giả định thử nghiệm và so với “bài tiếp theo”; không gọi đây là model đã được huấn luyện.
- Lưu `algorithm_version`, `generated_at`, `expires_at`, `reason_code`, `evidence_id`, `score` và trạng thái. API `GET /api/v1/me/recommendations` trả DTO với lý do tiếng Việt như “Bạn đã hoàn thành bài 2; bài 3 là bước tiếp theo” hoặc “Bạn chưa đạt điểm ôn tập về chủ đề này”. Gợi ý không được phán đoán năng lực cá nhân khi thiếu bằng chứng.
- Batch hàng ngày lấy học viên có thay đổi; API chỉ tính lại cho **một** học viên khi snapshot cũ, có rate limit. Batch dùng cursor và giới hạn số hàng để bảo vệ RDS 1 GiB. Khi dữ liệu ít hoặc job lỗi, hiển thị bài tiếp theo theo thứ tự giáo trình hoặc empty state.

### P2: sinh quiz nháp

- Endpoint đề xuất: `POST /api/v1/instructor/lessons/{lessonId}/quiz-drafts` với `sourceLessonIds`, số câu và độ khó. Xác thực chủ khóa học và giới hạn input/context. Không lấy câu trả lời quiz cũ hoặc dữ liệu học viên đưa vào prompt.
- Trả DTO `{questions:[{prompt,options,correctOptionIndex,explanation,sourceLessonId}],model}`. Validate chiều dài, 2–6 đáp án, một đáp án đúng, nguồn có thật, không trùng lặp; giảng viên xem/sửa từng câu. Sau duyệt mới gửi dữ liệu qua `QuizService.create` hiện có. Nếu model hết ngân sách, UI vẫn dùng editor thủ công.
- Tái dùng Gemini client với schema riêng cho quiz, parse/validate nghiêm ngặt và giới hạn từng lô 5–10 câu. Kiểm tra thực tế chất lượng tiếng Việt, đáp án đúng, nguồn và thời gian giảng viên sửa trước khi mở rộng; giới hạn số lượt gọi/chi phí ngoài AWS credit.

## Huấn luyện model theo đúng từng tác vụ

### Recommendation: train ranker từ dữ liệu học thật

- Model cần dự đoán một hoạt động học có phù hợp với một học viên **tại thời điểm đưa ra gợi ý**, không sinh văn bản. Dùng baseline ở trên trước; lưu candidate, vị trí hiển thị, version, click, bắt đầu học, hoàn thành và phản hồi “hữu ích/không phù hợp” để tạo nhãn. Dữ liệu hiện có chưa lưu **gợi ý nào đã được hiển thị**, nên chưa thể train ranker đáng tin cậy. Không dùng kết quả tương lai làm feature (data leakage), không coi “không click” là bằng chứng âm mạnh khi gợi ý chưa được thấy.
- Khi có đủ tương tác và nhiều học viên/khóa khác nhau, huấn luyện model nhỏ như XGBoost ranker/classifier bằng CPU theo batch, so với baseline trên tập kiểm thử chia theo **thời gian và học viên**. Feature có thể gồm tỷ lệ trả lời đúng theo skill, số lần thử, độ mới hoạt động, vị trí trong lộ trình và mức phù hợp mục tiêu, tất cả tính từ dữ liệu trước thời điểm hiển thị gợi ý. [XGBoost hỗ trợ ranking và CPU training](https://docs.aws.amazon.com/sagemaker/latest/dg/xgboost.html); đây là huấn luyện model từ dữ liệu EduAlto, không phải fine-tune LLM. Ngưỡng dữ liệu không đặt tùy tiện: đo độ phủ candidate, số label có giá trị và chất lượng trên holdout trước khi quyết định.
- Trích xuất batch nhỏ để không kéo tải RDS micro; huấn luyện trên Colab bằng feature tối thiểu với ID giả danh, không đưa dump production thô hay credentials dài hạn vào notebook. Xuất artifact bằng định dạng portable, kèm feature order, preprocessing, phiên bản thư viện, metric holdout và bộ ví dụ kiểm tra dự đoán. [XGBoost hỗ trợ lưu model JSON/UBJSON để nạp ở runtime khác](https://xgboost.readthedocs.io/en/stable/tutorials/saving_model.html). Đưa artifact đã kiểm tra lên S3 hoặc máy AWS của account AI, chạy inference trên CPU ở đó, ghi điểm gợi ý theo batch về PostgreSQL. API LMS đọc kết quả, kiểm tra lại quyền và có fallback. Nếu model không vượt baseline về tỷ lệ hoàn thành và độ đa dạng, giữ baseline.

### Model sinh nội dung và model tự huấn luyện là hai nhánh khác nhau

- Chatbot, nhập bài giảng và quiz nháp tiếp tục dùng Gemini. Chúng có thể chia lớp retrieval bài học, nhưng từng use case cần prompt/schema, giới hạn chi phí và kiểm thử riêng. Bài giảng mới vẫn được cung cấp lúc suy luận; không cần fine-tune để model "nhớ" giáo trình.
- Nếu sau này Gemini không đạt chất lượng, giá hoặc điều khoản sản phẩm, mới benchmark Bedrock, model open-weight hoặc provider khác theo **tổng chi phí train + serving + dữ liệu**. Bedrock không phải điều kiện để train model từ dữ liệu của EduAlto. AWS credits chỉ trả dịch vụ AWS đủ điều kiện, không trả API ngoài AWS.
- Ranker CPU và OCR recognizer fine-tune là hai loại model khác nhau; không gộp quiz, gợi ý và OCR vào một LLM chung. Chỉ xem xét fine-tune LLM cho quiz khi đã có nhiều câu hỏi được giảng viên sửa/duyệt và cải thiện đo được so với Gemini nền.

### OCR tài liệu tiếng Việt: đánh giá riêng trước khi fine-tune

- DOC/DOCX/PDF có lớp text tiếp tục dùng parser hiện tại. Với bản scan/ảnh, đo lỗi OCR trên tài liệu tiếng Việt thật và cho giảng viên duyệt text trước khi dùng để tạo bài/quiz. [Amazon Textract hiện chỉ liệt kê English, French, German, Italian, Portuguese và Spanish](https://docs.aws.amazon.com/textract/latest/dg/limits-document.html), nên không chọn Textract làm OCR tiếng Việt mặc định. Có thể thí điểm model OCR nguồn mở hỗ trợ tiếng Việt, ví dụ [PaddleOCR có mã ngôn ngữ `vi` và hướng dẫn custom training](https://www.paddleocr.ai/v2.10.0/en/ppocr/blog/multi_languages.html). Đánh giá dấu tiếng Việt, bảng, chữ viết tay và công thức riêng; chỉ fine-tune nếu lỗi lặp lại và có ảnh + bản chép đúng đủ chất lượng. [PaddleOCR mô tả quy trình fine-tune/evaluation](https://www.paddleocr.ai/v3.6.0/en/version2.x/ppocr/model_train/recognition.html). Không chạy OCR batch nặng song song với Java/RDS trên Lightsail 4 GB.

### Colab để train, máy AWS riêng để suy luận

- Luồng: dữ liệu đã giảm thiểu/giả danh → Colab train/đánh giá → xuất model + preprocessing/metadata + mẫu dự đoán chuẩn → lưu artifact có phiên bản trong account AI → máy AWS riêng nạp artifact và phục vụ inference → backend LMS gọi HTTPS. Không dùng notebook Colab làm server production: [Google nói VM bị xóa khi idle, GPU/thời lượng không được bảo đảm](https://research.google.com/colaboratory/faq.html). Luôn lưu checkpoint và artifact ra khỏi VM trước khi phiên kết thúc.
- Máy AI chỉ chứa runtime suy luận, không sở hữu quy tắc khóa học, quyền truy cập hay RDS của LMS. Backend LMS lọc quyền, tạo feature, xác thực request và lưu kết quả; inference server trả score hoặc text OCR. Đây là tách compute theo tải, còn domain EduAlto vẫn là modular monolith. Với hai account Lightsail, dùng HTTPS và token/ký yêu cầu, [giới hạn inbound theo static IP của máy LMS](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-firewall-and-port-mappings-in-amazon-lightsail.html); không coi hai account là cùng một mạng riêng mặc định.
- Ranker XGBoost nhỏ có thể chạy CPU và trả score nhanh; thử Lightsail 2 GB riêng trước, nâng nếu latency/RAM yêu cầu. OCR pretrained/fine-tuned có thể cần 4–8 GB RAM và xử lý bất đồng bộ, giới hạn một job/lượt; phải benchmark trên file scan thật. Không suy từ việc train được trên Colab GPU rằng model sẽ chạy tốt trên CPU AWS. Nếu cuối cùng chọn LLM nhiều tỷ tham số cần GPU inference, đây là phương án chi phí khác và không nên mặc định nhét vào ngân sách $200.
- Test parity: cùng một bộ feature/file mẫu phải cho kết quả gần như nhau trên Colab và AWS; đo RSS/CPU/p95 latency, thử restart và rollback artifact. Artifact không commit vào repository nếu lớn; lưu checksum và phiên bản trong deployment manifest.

### Phương án thử hai tác vụ

Máy AI riêng có thể phục vụ đồng thời model gợi ý đã train trên Colab và OCR pretrained/fine-tuned. Để kiểm tra kiến trúc trước khi nối với backend, dùng dữ liệu gợi ý giả lập và một bộ ảnh/PDF scan tiếng Việt được phép sử dụng; đo RAM, CPU, thời gian phản hồi và chất lượng OCR. Backend LMS tiếp tục sở hữu quyền truy cập và dữ liệu học tập, máy AI chỉ nhận feature vector hoặc file đã giới hạn. Đây mới là phương án phân tích, chưa tạo runtime thử nghiệm hay thay đổi production.

### Dataset công khai → Colab → AWS

- Có thể tải dataset từ Kaggle hoặc nguồn gốc, import Colab, chia train/validation/test, train/fine-tune, xuất artifact rồi phục vụ trên AWS. Kaggle là nơi phân phối, **không phải một giấy phép chung**: [Kaggle yêu cầu mỗi dataset công khai nêu license](https://www.kaggle.com/docs/datasets). Ghi URL nguồn gốc, phiên bản, license, quyền dùng cho sản phẩm và cách ghi công; mirror trên Kaggle không thay thế điều kiện của tác giả gốc. Không đưa API token/credentials vào notebook được chia sẻ.
- **OCR:** ưu tiên model pretrained rồi fine-tune bằng ảnh + nhãn text cùng dạng tài liệu EduAlto sẽ xử lý. Tách train/test theo **tài liệu hoặc nguồn**, không để crop từ cùng một trang xuất hiện ở cả hai tập. Đo CER/WER tiếng Việt, lỗi dấu, bố cục bảng/công thức và thời gian/peak RAM trên CPU AWS. [VinText của VinAI](https://github.com/VinAIResearch/dict-guided) là dữ liệu chữ trong cảnh thực và ghi giới hạn nghiên cứu/giáo dục; không mặc định phù hợp scan giáo trình hay dùng trong sản phẩm. Bộ [vn_documents_ocr_v2](https://github.com/nrl-ai/nom-vn/blob/main/benchmarks/data/vn_documents_ocr_v2/README.md) phù hợp hơn cho **benchmark scan** nhưng nhỏ và có license khác nhau theo nguồn; kiểm tra metadata từng mẫu. Bộ scan giáo trình thật, được phép dùng và chép đúng, vẫn cần làm tập test giữ riêng.
- **Gợi ý học tập:** [OULAD](https://archive.ics.uci.edu/dataset/349/open+university+learning+analytics+dataset) có tương tác học tập và CC BY 4.0, nhưng là khóa đại học và không cung cấp trực tiếp nhãn "bài tiếp theo nào giúp học viên EduAlto học tốt hơn". [EdNet](https://github.com/riiid/ednet) có chuỗi câu hỏi/skill phong phú hơn, nhưng từ ứng dụng luyện thi tiếng Anh Hàn Quốc và phát hành CC BY-NC 4.0 cho nghiên cứu. Dùng dữ liệu công khai để thử feature extraction, knowledge tracing và pipeline huấn luyện; không xem metric trên OULAD/EdNet là chất lượng recommendation của EduAlto. Model production cần skill mapping, log lần gợi ý được hiển thị và kết quả học **từ EduAlto**, rồi đánh giá trên holdout theo thời gian/học viên/khóa.
- **Artifact:** lưu cùng model cả thứ tự feature, tiền xử lý, taxonomy/nhãn, phiên bản thư viện, license nguồn dữ liệu, metric theo từng tập và một bộ input/output chuẩn để kiểm tra parity Colab↔AWS. Không chỉ chuyển file weights/checkpoint. Khi Colab hết phiên, VM có thể bị xóa; lưu checkpoint/artifact ra ngoài. [Giới hạn Colab thay đổi và không bảo đảm GPU](https://research.google.com/colaboratory/faq.html).

### Hai tài khoản AWS, Region và quyền sở hữu model

- Chủ dự án xác nhận account LMS còn **$198 credit** và account thứ hai đang hiển thị **$200 credit**. Kiểm tra hạn dùng và khoản phí credit thực sự chi trả trên Billing của **từng** account; không gộp hai số dư vào một ví. Credit không chuyển giữa accounts. [AWS Free Tier FAQ](https://aws.amazon.com/free/free-tier-faqs/) nêu quy tắc chung nhưng không phủ nhận số dư đang hiển thị trên hai account thực tế.
- `ap-southeast-2a` là Availability Zone thuộc Region Sydney `ap-southeast-2`. Credit của một account có thể áp dụng ở Region khác cho dịch vụ đủ điều kiện; kiểm tra quota, quyền truy cập dịch vụ, account plan và giá **tại Region chạy máy AI**. [AWS nói advanced features mở thêm nhiều Region và vẫn giữ credit đã có, nhưng không thể quay về Free plan](https://aws.amazon.com/free/free-tier-faqs/); không đổi plan chỉ để chạy một thí nghiệm khi chưa cần. Máy AI ở account thứ hai có thể chạy tại Sydney để giảm độ trễ với backend LMS, nhận artifact đã train từ Colab và trả kết quả qua HTTPS. Dữ liệu học viên đưa qua account khác phải tối thiểu, giả danh và có chính sách lưu/xóa rõ ràng.

## Chi phí đến 15/01/2027

Thời gian tính từ 11/10/2026 là 96 ngày, quy đổi bảo thủ 3,2 tháng. Bảng dưới đây là phương án **account LMS với $198 còn lại**, nếu credit dùng được cho những dịch vụ này và chưa hết hạn. Cần kiểm tra Billing để xác nhận gói Lightsail, dung lượng RDS, snapshot, mức credit áp dụng và ngày hết hạn. Chi phí Gemini không nằm trong bảng vì không dùng AWS credits.

| Khoản | Căn cứ | Ước tính 96 ngày |
| --- | --- | ---: |
| Lightsail 4 GB / 2 vCPU / 80 GB, bundle IPv4 | $24/tháng | $76,80 |
| RDS `db.t4g.micro`, PostgreSQL Single-AZ ở Sydney | $0,025/giờ × 2.304 giờ | $57,60 |
| RDS gp3 20 GB giả định | $0,138/GB-tháng × 3,2 tháng | $8,83 |
| Chi phí phụ dự phòng: log, snapshot vượt mức, traffic, CPU credit | Khoản giữ chỗ, không phải báo giá | $15,00 |
| Dự trữ rủi ro | Không phân bổ | $20,00 |
| **Tổng kế hoạch** | | **$178,23** |

So với $198 còn lại, biên khoảng **$19,77**. Mỗi 10 GB RDS phát sinh thêm khoảng **$4,42** trong 3,2 tháng. Nếu storage thực tế lớn hơn 20 GB, RDS Multi-AZ, CPU credit phát sinh, snapshot tính phí hoặc Lightsail là gói khác thì kế hoạch phải điều chỉnh. Không cộng thêm $0,005/giờ cho IPv4 Lightsail đã nằm trong bundle; [AWS nói static IP gắn vào Lightsail không bị tính thêm](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-static-ip-addresses-in-amazon-lightsail.html). Bảng tính giả định RDS không có IPv4 công khai; cấu hình thực tế cần kiểm tra trong AWS.

**Phương án máy AI chạy liên tục ở account thứ hai:** theo [giá Lightsail Linux có IPv4](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html), 2 GB là $12/tháng (~$38,40 cho 3,2 tháng), 4 GB $24/tháng (~$76,80), 8 GB $44/tháng (~$140,80). Trên $200 credit account AI, 4 GB để lại khoảng $123,20 và 8 GB khoảng $59,20 **trước** snapshot, transfer vượt mức, artifact storage và khoản khác; đây chỉ là phép chiếu nếu credit áp dụng được. Chọn 2–4 GB cho ranker CPU, 4–8 GB để thử OCR bất đồng bộ theo benchmark. Colab train không tiêu AWS credit; nâng Colab Pro hoặc mua compute unit là hóa đơn Google. Không dùng GPU AWS 24/7 trong ngân sách này.

Nguồn giá: [Lightsail bundles](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html); [bảng giá công khai Amazon RDS tại Sydney](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/ap-southeast-2/index.json); [RDS CPU credits](https://aws.amazon.com/rds/postgresql/pricing/).

AWS Free Tier “up to $200” không bảo đảm dịch vụ nào cũng được credit chi trả. [AWS nêu Free plan hết sau 6 tháng hoặc hết credit; thời hạn credit phụ thuộc trạng thái/tài khoản](https://aws.amazon.com/free/free-tier-faqs/). Ngày hết hạn thực tế trong Billing quan trọng hơn phép chiếu chi phí. Gemini API (dù đang dùng hạn mức miễn phí hay trả phí), Cloudflare R2, Vercel và các nhà cung cấp ngoài AWS **không dùng** $198 AWS credits này.

## Vận hành trên máy 4 GB và RDS 1 GiB

- Một backend process và một Redis container; job gọi Gemini tối đa một lượt tạo nội dung đồng thời. Giới hạn heap Java/container sau khi đo bộ nhớ thực tế, không phân bổ toàn bộ 4 GB cho JVM vì còn Docker, OS và self-hosted GitHub runner. Đẩy Docker build sang GitHub-hosted runner khi thấy CPU/memory spike lúc deploy.
- Dùng batch nhỏ, `LIMIT`, index theo `user_id/occurred_at` và `status/generated_at`, chỉ cập nhật học viên thay đổi. Không chạy full-table scan trên request; theo dõi `CPUUtilization`, `FreeableMemory`, `DatabaseConnections`, `CPUCreditBalance`, chi phí `CPUSurplusCreditsCharged` của RDS.
- Lưu bộ đếm token và ngân sách Gemini có tính bền vững trong PostgreSQL; Redis hiện tại chỉ phù hợp rate limit ngắn hạn vì Compose chưa cấu hình persistence. Áp giới hạn theo ngày và toàn kỳ. Log `provider`, `model`, `request_type`, input/output tokens, giá ước tính, trạng thái, độ trễ; không log prompt/dữ liệu học viên. Ngừng provider calls khi chạm ngưỡng nội bộ. AWS Budgets chỉ cảnh báo chi phí AWS, không kiểm soát hóa đơn Gemini; cả hai đều không phải hard cap tức thời.
- Job có trạng thái bền vững và lease để khôi phục sau restart; retry có backoff, idempotency và dead-letter state. Với 1 worker và lưu lượng nhỏ, PostgreSQL job table đủ dùng; không cần thêm hàng đợi managed hoặc service riêng.
- Với chatbot hiện tại, giữ PostgreSQL full-text search cho dữ liệu bài học có quyền truy cập. RDS 1 GiB chưa có lý do cài `pgvector`; extension này [được RDS hỗ trợ](https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-extensions.html) nhưng chỉ thêm nếu đánh giá truy xuất cho thấy lexical search bỏ sót nhiều và đã kiểm tra tác động lên RDS. Trường hợp về sau dùng embedding, chỉ index nội dung xuất bản/được phép, cập nhật khi nội dung đổi và lọc quyền **trước** khi trả nguồn.

## Các mốc quyết định

1. **Trước khi mở cho học viên:** kiểm tra điều khoản/độ tuổi của Gemini và quyết định provider phù hợp; xác nhận credit expiry và chi phí thực tế trong Billing của hai account; kiểm thử quyền truy cập, nội dung tiếng Việt và fallback.
2. **Sprint đầu:** migration/taxonomy/signal pipeline, profile kỹ năng, API và UI mức thành thạo có độ tin cậy. Đo tải RDS với dữ liệu mô phỏng gần thực tế.
3. **Sprint kế:** recommendation bài học/khóa học và lý do; log gợi ý thực sự đã hiển thị, được chọn và hoàn thành; dùng baseline deterministic để đo hiệu quả.
4. **Sau đủ dữ liệu:** train XGBoost ranker trên Colab, đánh giá holdout và chỉ bật nếu vượt baseline; triển khai artifact lên máy AWS riêng với parity/latency test. Thử OCR pretrained trên scan thật, fine-tune trên Colab nếu có nhãn và cải thiện rõ; đo RAM/CPU trên máy AWS trước khi mở cho người dùng. Dùng Gemini tạo quiz nháp với duyệt của giảng viên; chỉ cân nhắc fine-tune LLM nếu sau này chứng minh được nhu cầu riêng.

Kế hoạch này chỉ thay đổi tài liệu nghiên cứu, chưa kích hoạt AWS service, đổi code, gọi model hay tạo chi phí.
