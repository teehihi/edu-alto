import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ProfilePage } from "./profile-page";

const currentUser = {
  id: "user-1",
  fullName: "Nguyễn Minh Anh",
  email: "minhanh@example.com",
  status: "ACTIVE",
  roles: ["STUDENT"],
  emailVerifiedAt: "2026-09-18T00:00:00Z",
  createdAt: "2026-09-18T00:00:00Z",
  updatedAt: "2026-09-18T00:00:00Z"
};
const getCurrentUserMock = vi.fn().mockResolvedValue(currentUser);
const updateCurrentUserMock = vi.fn().mockResolvedValue({
  ...currentUser,
  fullName: "Nguyễn Minh Anh Updated",
});

vi.mock("@/features/auth/auth-client", () => ({
  useAuth: () => ({
    user: currentUser,
    loading: false,
    isAuthenticated: true,
    login: vi.fn(),
    getCurrentUser: getCurrentUserMock,
    logout: vi.fn(),
    updateCurrentUser: updateCurrentUserMock
  })
}));

describe("ProfilePage", () => {
  it("loads the current profile and saves editable fields", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    expect(await screen.findByDisplayValue("Nguyễn Minh Anh")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Họ và tên"));
    await user.type(screen.getByLabelText("Họ và tên"), "Nguyễn Minh Anh Updated");
    await user.click(screen.getByRole("button", { name: /lưu hồ sơ/i }));

    await waitFor(() => expect(updateCurrentUserMock).toHaveBeenCalledWith({ fullName: "Nguyễn Minh Anh Updated" }));
  });
});
