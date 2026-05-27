import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Panel } from "@/components/ui/Panel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Slider } from "@/components/ui/Slider";
import { StatCard } from "@/components/ui/StatCard";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("Button", () => {
  it("calls onClick when enabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Run</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Run
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies size class for sm variant", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-[30px]");
  });

  it("merges custom className", () => {
    render(<Button className="custom-x">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("custom-x");
  });

  it("renders outline variant with border class", () => {
    render(
      <Button variant="outline" color="teal">
        Outline
      </Button>,
    );
    expect(screen.getByRole("button").className).toMatch(/border/);
  });
});

describe("Badge", () => {
  it.each([
    ["filled", "bg-teal-6"],
    ["light", "bg-teal-0"],
    ["outline", "border"],
  ] as const)("renders %s variant", (variant, classFragment) => {
    render(
      <Badge variant={variant} color="teal">
        Label
      </Badge>,
    );
    expect(screen.getByText("Label").className).toMatch(new RegExp(classFragment));
  });
});

describe("Slider", () => {
  it("fires onChange with numeric value", () => {
    const onChange = vi.fn();
    render(<Slider label="Alpha" min={0} max={2} step={0.1} value={1} onChange={onChange} />);
    const input = screen.getByRole("slider");
    fireEvent.change(input, { target: { value: "1.5" } });
    expect(onChange).toHaveBeenCalledWith(1.5);
  });

  it("applies format to display value", () => {
    render(
      <Slider
        label="Epsilon"
        min={0}
        max={1}
        step={0.01}
        value={0.1}
        onChange={vi.fn()}
        format={(v) => `${(v * 100).toFixed(0)}%`}
      />,
    );
    expect(screen.getByText("10%")).toBeInTheDocument();
  });

  it("shows min and max labels", () => {
    render(<Slider label="Alpha" min={0} max={5} step={1} value={2} onChange={vi.fn()} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});

describe("Card", () => {
  it("renders children inside wrapper", () => {
    render(<Card>Inner content</Card>);
    expect(screen.getByText("Inner content")).toBeInTheDocument();
  });
});

describe("Panel", () => {
  it("renders title and children", () => {
    render(<Panel title="Metrics">Panel body</Panel>);
    expect(screen.getByText("Metrics")).toBeInTheDocument();
    expect(screen.getByText("Panel body")).toBeInTheDocument();
  });
});

describe("StatCard", () => {
  it("renders value label and sub", () => {
    render(<StatCard value="42" label="Steps" sub="total" color="#228be6" />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Steps")).toBeInTheDocument();
    expect(screen.getByText("total")).toBeInTheDocument();
  });
});

describe("SectionHeader", () => {
  it("renders children", () => {
    render(<SectionHeader>Section title</SectionHeader>);
    expect(screen.getByText("Section title")).toBeInTheDocument();
  });
});
