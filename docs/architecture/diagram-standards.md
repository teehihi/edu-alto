# Diagram Standards

EduAlto dùng đúng loại sơ đồ cho đúng mục đích tài liệu. Mermaid vẫn được dùng cho sơ đồ kỹ thuật nhanh, flow và ERD; các sơ đồ UML nghiệp vụ nên có source UML/EA-style và SVG dễ đọc trong tài liệu.

## Tooling matrix

| Diagram type | Preferred tool/source | Repository guidance |
| --- | --- | --- |
| Use Case Diagram | UML tool / EA / PlantUML-style source | Dùng actor, system boundary, oval use case và association line. Không biểu diễn bằng flowchart thường. |
| Class Diagram | UML tool / EA / PlantUML-style source | Dùng class/interface, attribute, operation, relationship, multiplicity khi có thiết kế class ổn định. |
| Sequence Diagram | UML tool / EA hoặc Mermaid | Mermaid `sequenceDiagram` được chấp nhận nếu message/order/lifeline rõ. |
| Activity Diagram | UML tool / EA hoặc Mermaid | Mermaid được chấp nhận cho flow đơn giản; flow nghiệp vụ phức tạp nên dùng UML activity/swimlane. |
| State Diagram | UML tool / EA / PlantUML-style source | Dùng initial/final state, transition, guard condition. Không dùng flowchart thay thế. |
| Component Diagram | UML tool / EA hoặc Mermaid | Mermaid được chấp nhận cho architecture/module view; UML component nên dùng khi mô tả provided/required interface. |
| Deployment Diagram | UML tool / EA / PlantUML-style source | Dùng node, execution environment, artifact/container và protocol connector. |
| ERD | Mermaid / DB tool | Mermaid `erDiagram` hoặc DB tool đều phù hợp. |
| Architecture overview | Mermaid | Dùng để truyền đạt boundary/layer/dependency tổng quan. |
| System flow | Mermaid | Phù hợp cho data flow, technical flow và high-level process. |
| CI/CD flow | Mermaid | Phù hợp cho pipeline/stage flow. |
| Git/technical documentation | Mermaid | Phù hợp cho branch, dependency hoặc maintenance note. |

## Repository convention

- `.puml` dùng làm source cho sơ đồ UML/EA-style khi có thể.
- `.mmd` chỉ dùng cho Mermaid source thật sự. Nếu diagram đã có UML `.puml`, không giữ thêm `.mmd` mirror để tránh trùng lặp và nặng repo.
- `.svg` là bản render được nhúng trong Markdown.
- Khi nội dung nghiệp vụ thay đổi, cập nhật source trước rồi mới cập nhật SVG.
- Không thay flow Mermaid thành UML nếu đó là architecture overview, ERD, system flow hoặc sequence đang đọc tốt.
