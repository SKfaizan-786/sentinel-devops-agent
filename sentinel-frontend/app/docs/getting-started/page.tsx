"use client";


import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useEffect, useState } from "react";
import Link from "next/link";

// ---- Simple local UI helpers ----
// Replace these with shadcn/ui or your design system if available.

function CodeBlock({ title, code }: { title?: string; code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (e) {
            console.error("Failed to copy", e);
        }
    };

    return (
        <div className="rounded-md border bg-muted/40 mb-4">
            <div className="flex items-center justify-between px-3 py-2 border-b text-xs text-muted-foreground">
                <span>{title ?? "Command"}</span>
                <button
                    onClick={handleCopy}
                    className="rounded border px-2 py-1 text-xs hover:bg-muted"
                >
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <pre className="overflow-x-auto px-3 py-2 text-xs">
                <code>{code}</code>
            </pre>
        </div>
    );
}

function StepCard({
    step,
    title,
    children,
}: {
    step: number;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-lg border bg-background/60 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {step}
                </span>
                <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">{children}</div>
        </section>
    );
}

type IssueItem = {
    id: string;
    question: string;
    answer: string;
};

const TROUBLESHOOTING_ITEMS: IssueItem[] = [
    {
        id: "docker-daemon",
        question: "Docker daemon not running",
        answer:
            "If `docker-compose up -d` says it cannot connect to the Docker daemon, start Docker Desktop on Windows/macOS. On Linux, run `sudo systemctl start docker && sudo systemctl enable docker` and try again.",
    },
    {
        id: "ports-in-use",
        question: "Ports 3000 / 4000 / 9090 already in use",
        answer:
            "Use `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows) to find the conflicting process, stop it or change ports in your env files, then restart the stack.",
    },
    {
        id: "frontend-backend",
        question: "Dashboard cannot reach backend API",
        answer:
            "First curl `http://localhost:4000/api/status`. If it works, ensure `NEXT_PUBLIC_BACKEND_URL` in `sentinel-frontend/.env.local` is `http://localhost:4000`, then restart the frontend dev server or Docker container.",
    },
    {
        id: "rbac-login",
        question: "Login fails for admin@example.com / password123",
        answer:
            "Run `npm run quick-setup` inside the `backend` folder to re-seed RBAC data and verify the Postgres container is running with `docker ps | grep postgres`.",
    },
    {
        id: "cli-not-found",
        question: "`sentinel` CLI command not found",
        answer:
            "From the `cli` directory run `npm install` and `npm link`, then open a new terminal and run `sentinel --help`. On Windows ensure your global npm bin folder is on the PATH.",
    },
];

function TroubleshootingAccordion() {
    const [openId, setOpenId] = useState<string | null>(TROUBLESHOOTING_ITEMS[0].id);

    return (
        <div className="space-y-2">
            {TROUBLESHOOTING_ITEMS.map((item) => {
                const open = item.id === openId;
                return (
                    <div
                        key={item.id}
                        className="overflow-hidden rounded-md border bg-background/60"
                    >
                        <button
                            type="button"
                            onClick={() => setOpenId(open ? null : item.id)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
                        >
                            <span>{item.question}</span>
                            <span className="text-xs text-muted-foreground">
                                {open ? "Hide" : "Show"}
                            </span>
                        </button>
                        {open && (
                            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                                {item.answer}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// Simple “progress” stored in localStorage so users can tick steps.
const PROGRESS_KEYS = [
    "prerequisites",
    "clone",
    "env",
    "docker",
    "rbac",
    "frontend",
    "cli",
] as const;
type ProgressKey = (typeof PROGRESS_KEYS)[number];

export default function GettingStartedPage() {
    const [progress, setProgress] = useState<Record<ProgressKey, boolean>>({
        prerequisites: false,
        clone: false,
        env: false,
        docker: false,
        rbac: false,
        frontend: false,
        cli: false,
    });

    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const stored = window.localStorage.getItem("sentinel-getting-started");
            if (stored) {
                const parsed = JSON.parse(stored) as Record<ProgressKey, boolean>;
                setProgress((prev) => ({ ...prev, ...parsed }));
            }
        } catch {
            // ignore
        }
        setLoaded(true);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !loaded) return;
        window.localStorage.setItem(
            "sentinel-getting-started",
            JSON.stringify(progress)
        );
    }, [progress, loaded]);

    const toggle = (key: ProgressKey) =>
        setProgress((p) => ({ ...p, [key]: !p[key] }));

    return (
        <div>
            <DashboardHeader />
        <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 lg:flex-row lg:px-8">
            {/* Left: content */}
            <div className="flex-1 space-y-6">
                <header className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Getting Started with Sentinel
                    </h1>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        From a fresh clone to a running, AI‑powered DevOps dashboard with
                        auto‑healing and CLI tools.
                    </p>
                </header>

                <StepCard step={1} title="Prerequisites">
                    <p>
                        Before you start, install Docker, Node.js 18+, Git, and create a
                        Groq API key.
                    </p>
                    <ul className="list-disc pl-5">
                        <li>
                            Docker & Docker Compose –{" "}
                            <a
                                href="https://docs.docker.com/get-docker/"
                                className="underline"
                                target="_blank"
                            >
                                installation guide
                            </a>
                        </li>
                        <li>
                            Node.js 18+ –{" "}
                            <a
                                href="https://nodejs.org/en/download/"
                                className="underline"
                                target="_blank"
                            >
                                downloads
                            </a>
                        </li>
                        <li>
                            Git –{" "}
                            <a
                                href="https://git-scm.com/downloads"
                                className="underline"
                                target="_blank"
                            >
                                installers
                            </a>
                        </li>
                        <li>
                            Groq API key –{" "}
                            <a
                                href="https://console.groq.com/"
                                className="underline"
                                target="_blank"
                            >
                                Groq console
                            </a>
                        </li>
                    </ul>
                    <p className="text-xs">
                        PostgreSQL, Kestra, and mock services are launched automatically via{" "}
                        <code>docker-compose.yml</code>; no separate install is needed.
                    </p>
                </StepCard>

                <StepCard step={2} title="Clone the Repository">
                    <p>Clone the Sentinel repo and move into the project folder.</p>
                    <CodeBlock
                        title="Clone & enter"
                        code={`git clone https://github.com/SKfaizan-786/sentinel-devops-agent.git
cd sentinel-devops-agent`}
                    />
                </StepCard>

                <StepCard step={3} title="Configure Environment Variables">
                    <p className="font-medium">Backend (.env)</p>
                    <p>Copy the example env file and edit required values.</p>
                    <CodeBlock
                        title="Backend env"
                        code={`cp backend/.env.example backend/.env`}
                    />
                    <p className="text-xs">
                        At minimum, set <code>GROQ_API_KEY</code>, check the Postgres
                        credentials, and change <code>JWT_SECRET</code> for anything beyond
                        local testing.
                    </p>

                    <p className="mt-4 font-medium">Frontend (.env.local)</p>
                    <CodeBlock
                        title="Frontend env"
                        code={`cd sentinel-frontend
cp .env.example .env.local
# set NEXT_PUBLIC_BACKEND_URL to http://localhost:4000
cd ..`}
                    />
                </StepCard>

                <StepCard step={4} title="Start the Full Stack with Docker">
                    <p>Bring up backend, frontend, Kestra and dependencies in one step.</p>
                    <CodeBlock title="Docker up" code={`docker-compose up -d`} />
                    <p>Verify containers are running:</p>
                    <CodeBlock title="Check containers" code={`docker ps`} />
                    <p className="text-xs">
                        You should see containers for the backend, frontend, Kestra,
                        Postgres, and the mock services for <code>auth</code>,{" "}
                        <code>payment</code>, and <code>notification</code>.
                    </p>
                </StepCard>

                <StepCard step={5} title="Initialize Backend & RBAC">
                    <p>Install backend dependencies and run the quick setup script.</p>
                    <CodeBlock
                        title="Backend setup"
                        code={`cd backend
npm install
npm run quick-setup`}
                    />
                    <p className="text-xs">
                        This seeds a default admin user for local development:
                        <br />
                        <code>admin@example.com / password123</code> – change this after
                        logging in.
                    </p>
                </StepCard>

                <StepCard step={6} title="Run Frontend via npm (Optional)">
                    <p>
                        If you prefer a Next.js dev server instead of the Dockerized
                        frontend:
                    </p>
                    <CodeBlock
                        title="Frontend dev"
                        code={`cd sentinel-frontend
npm install
npm run dev`}
                    />
                    <p className="text-xs">
                        The app will be available at{" "}
                        <code>http://localhost:3000</code>. Ensure the backend is running
                        on port 4000.
                    </p>
                </StepCard>

                <StepCard step={7} title="CLI Quick Start">
                    <p>Use the Sentinel CLI to interact with the system.</p>
                    <CodeBlock
                        title="Install CLI"
                        code={`cd cli
npm install
npm link`}
                    />
                    <CodeBlock
                        title="Example CLI commands"
                        code={`# Show overall system health
sentinel status

# Simulate failures (chaos tests)
sentinel simulate auth down
sentinel simulate payment degraded
sentinel simulate notification slow

# Trigger a manual heal action
sentinel heal auth

# Generate an AI incident report
sentinel report`}
                    />
                </StepCard>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">
                        Common Issues &amp; Troubleshooting
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Ran into a problem? Start with these frequently‑seen errors and
                        fixes.
                    </p>
                    <TroubleshootingAccordion />
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">Next Steps</h2>
                    <p className="text-sm text-muted-foreground">
                        Once you are comfortable with the basic setup, dive deeper into the
                        architecture and APIs.
                    </p>
                    <ul className="list-disc pl-5 text-sm">
                        <li>
                            <Link href="" className="underline">
                                ARCHITECTURE.md
                            </Link>{" "}
                            – high‑level system design and data flow.
                        </li>
                        <li>
                            <Link href="" className="underline">
                                API.md
                            </Link>{" "}
                            – backend API reference.
                        </li>
                        <li>
                            <Link href="" className="underline">
                                DEVELOPMENT.md
                            </Link>{" "}
                            – advanced dev workflows.
                        </li>
                        <li>
                            <Link href="" className="underline">
                                DOCUMENTATION.md
                            </Link>
                            – documentation index.
                        </li>
                        <li>
                            <Link href="" className="underline">
                                FAQ.md
                            </Link>{" "}
                            – common operational questions.
                        </li>
                    </ul>
                </section>
            </div>

            {/* Right: progress sidebar */}
            <aside className="w-full max-w-xs space-y-4 rounded-lg border bg-background/60 p-4 text-sm lg:sticky lg:top-16 lg:h-fit">
                <h2 className="text-sm font-semibold">Setup Progress</h2>
                <p className="text-xs text-muted-foreground">
                    Check off steps as you complete them. Progress is saved in your
                    browser.
                </p>
                <div className="space-y-2 pt-2">
                    {PROGRESS_KEYS.map((key) => (
                        <label key={key} className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                className="h-3 w-3 accent-primary"
                                checked={progress[key]}
                                onChange={() => toggle(key)}
                            />
                            <span className="capitalize">{key}</span>
                        </label>
                    ))}
                </div>
            </aside>
        </main>
        </div>
    );
}
