import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

vi.mock("@/lib/session", () => ({
  getSession: () => ({ signedIn: false, name: null }),
  tryAutoResume: () => Promise.resolve(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/components/m2/M2ProfileMenu", () => ({
  default: ({ open }: any) => (open ? <div data-testid="mock-profile-menu" /> : null),
}));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
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

import Module2Shell from "@/components/m2/Module2Shell";

describe("Module2Shell", () => {
  it("renders three tabs", () => {
    render(<Module2Shell><div>content</div></Module2Shell>);
    expect(screen.getByTestId("m2-tab-tastings")).toBeDefined();
    expect(screen.getByTestId("m2-tab-taste")).toBeDefined();
    expect(screen.getByTestId("m2-tab-circle")).toBeDefined();
  });

  it("renders profile button", () => {
    render(<Module2Shell><div>content</div></Module2Shell>);
    expect(screen.getByTestId("m2-profile-button")).toBeDefined();
  });

  it("renders children content", () => {
    render(<Module2Shell><div data-testid="test-child">Hello</div></Module2Shell>);
    expect(screen.getByTestId("test-child")).toBeDefined();
  });

  it("renders logo", () => {
    render(<Module2Shell><div>content</div></Module2Shell>);
    expect(screen.getByTestId("m2-logo")).toBeDefined();
  });
});
