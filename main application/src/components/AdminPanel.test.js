import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AdminPanel from "./AdminPanel";
import { useAuth } from "../context/AuthContext";

jest.mock("../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const modules = [
  { id: "viewer", name: "Viewer" },
  { id: "survey", name: "Survey" },
];

const users = [
  { id: "user-1", name: "Nikita", email: "nikita@example.com", modules: ["viewer"], status: "active", isAdmin: false },
  { id: "user-2", name: "Aman", email: "aman@example.com", modules: ["survey"], status: "active", isAdmin: false },
];

describe("AdminPanel permission edit mode", () => {
  const adminFetchModules = jest.fn();
  const adminFetchUsers = jest.fn();
  const adminCreateUser = jest.fn();
  const adminUpdateUserRole = jest.fn();
  const adminUpdateUserStatus = jest.fn();
  const adminDeleteUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    adminFetchModules.mockResolvedValue(modules);
    adminFetchUsers.mockResolvedValue(users);
    adminUpdateUserRole.mockResolvedValue({});
    useAuth.mockReturnValue({
      adminFetchModules,
      adminFetchUsers,
      adminCreateUser,
      adminUpdateUserRole,
      adminUpdateUserStatus,
      adminDeleteUser,
    });
  });

  test("keeps permissions read-only until one admin row enters edit mode", async () => {
    render(<AdminPanel />);

    const firstRow = await screen.findByText("Nikita").then((name) => name.closest("tr"));
    const secondRow = screen.getByText("Aman").closest("tr");

    expect(within(firstRow).queryByRole("checkbox", { name: "Survey" })).not.toBeInTheDocument();

    fireEvent.click(within(firstRow).getByRole("button", { name: "Edit" }));

    expect(within(firstRow).getByRole("checkbox", { name: "Survey" })).toBeInTheDocument();
    expect(within(secondRow).getByRole("button", { name: "Edit" })).toBeDisabled();

    fireEvent.click(within(firstRow).getByRole("checkbox", { name: "Survey" }));
    expect(adminUpdateUserRole).not.toHaveBeenCalled();

    fireEvent.click(within(firstRow).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(adminUpdateUserRole).toHaveBeenCalledWith("user-1", ["viewer", "survey"]);
    });
  });
});
