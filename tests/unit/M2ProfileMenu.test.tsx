import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let mockSession = { signedIn: false, name: null as string | null, pid: undefined as string | undefined };
let mockSignInResult = { ok: true, name: "Test User", resumeToken: "abc123" };

vi.mock("@/lib/session", () => ({
  getSession: () => mockSession,
  signIn: vi.fn(async () => mockSignInResult),
  signOut: vi.fn(async () => {
    mockSession = { signedIn: false, name: null, pid: undefined };
  }),
  tryAutoResume: () => Promise.resolve(),
}));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
  useLocation: () => ["/m2/tastings", vi.fn()],
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/lib/i18n", () => ({
  default: { language: "en", changeLanguage: vi.fn() },
}));

import M2ProfileMenu from "@/components/m2/M2ProfileMenu";
import { signIn } from "@/lib/session";

describe("M2ProfileMenu", () => {
  beforeEach(() => {
    mockSession = { signedIn: false, name: null, pid: undefined };
    mockSignInResult = { ok: true, name: "Test User", resumeToken: "abc123" };
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<M2ProfileMenu open={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders sign-in form when logged out", () => {
    render(<M2ProfileMenu open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("m2-profile-email")).toBeDefined();
    expect(screen.getByTestId("m2-profile-password")).toBeDefined();
    expect(screen.getByTestId("m2-profile-signin")).toBeDefined();
  });

  it("sign-in button is disabled when fields are empty", () => {
    render(<M2ProfileMenu open={true} onClose={vi.fn()} />);
    const btn = screen.getByTestId("m2-profile-signin") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("sign-in button becomes enabled when fields are filled", () => {
    render(<M2ProfileMenu open={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("m2-profile-email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByTestId("m2-profile-password"), { target: { value: "password123" } });
    const btn = screen.getByTestId("m2-profile-signin") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("calls signIn with correct options object on submit", async () => {
    const onClose = vi.fn();
    render(<M2ProfileMenu open={true} onClose={onClose} />);
    fireEvent.change(screen.getByTestId("m2-profile-email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByTestId("m2-profile-password"), { target: { value: "mypassword" } });
    fireEvent.click(screen.getByTestId("m2-profile-signin"));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({
        pin: "mypassword",
        email: "test@example.com",
        mode: "log",
        remember: true,
      });
    });
  });

  it("shows error on failed login", async () => {
    mockSignInResult = { ok: false, name: "", resumeToken: "", error: "Invalid password" } as any;
    render(<M2ProfileMenu open={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("m2-profile-email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByTestId("m2-profile-password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByTestId("m2-profile-signin"));

    await waitFor(() => {
      expect(screen.getByTestId("m2-profile-error")).toBeDefined();
    });
  });

  it("renders menu options when logged in", () => {
    mockSession = { signedIn: true, name: "Christoph", pid: "abc" };
    render(<M2ProfileMenu open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("m2-profile-display-name")).toBeDefined();
    expect(screen.getByTestId("m2-profile-settings")).toBeDefined();
    expect(screen.getByTestId("m2-profile-signout")).toBeDefined();
    expect(screen.getByTestId("m2-profile-data")).toBeDefined();
    expect(screen.getByTestId("m2-profile-classic")).toBeDefined();
  });

  it("shows user name when logged in", () => {
    mockSession = { signedIn: true, name: "Christoph", pid: "abc" };
    render(<M2ProfileMenu open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("m2-profile-display-name").textContent).toBe("Christoph");
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    render(<M2ProfileMenu open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("m2-profile-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Enter key submits the form", async () => {
    render(<M2ProfileMenu open={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("m2-profile-email"), { target: { value: "test@example.com" } });
    const pwInput = screen.getByTestId("m2-profile-password");
    fireEvent.change(pwInput, { target: { value: "mypassword" } });
    fireEvent.keyDown(pwInput, { key: "Enter" });

    await waitFor(() => {
      expect(signIn).toHaveBeenCalled();
    });
  });
});
