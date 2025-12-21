import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Download, CheckCircle, AlertCircle, Rocket, Upload, Github, Settings, Zap } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function GettingStarted() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Helper to add page if needed
      const checkAddPage = (neededSpace: number) => {
        if (yPos + neededSpace > 280) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Title
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229); // Indigo
      doc.text("AI Deploy Agent", 105, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(16);
      doc.setTextColor(100, 100, 100);
      doc.text("Getting Started Guide", 105, yPos, { align: "center" });
      yPos += 20;

      // Section 1: What You Need
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("1. What You Need to Get Started", 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      
      const requirements = [
        { icon: "✓", text: "AI Deploy Agent account (free signup)" },
        { icon: "✓", text: "Vercel account (free at vercel.com)" },
        { icon: "✓", text: "Your project code (ZIP file or GitHub repo)" },
        { icon: "✓", text: "package.json file in your project root" },
      ];

      requirements.forEach((req) => {
        checkAddPage(8);
        doc.setTextColor(34, 197, 94); // Green
        doc.text(req.icon, 25, yPos);
        doc.setTextColor(0, 0, 0);
        doc.text(req.text, 35, yPos);
        yPos += 7;
      });

      yPos += 5;

      // Section 2: Quick Setup
      checkAddPage(30);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("2. Quick Setup (5 Minutes)", 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      const setupSteps = [
        {
          step: "Step 1",
          title: "Connect Your Vercel Account",
          description: "Go to Settings > Click 'Connect Vercel' > Complete OAuth flow",
        },
        {
          step: "Step 2",
          title: "Select Your Team",
          description: "Choose personal or team workspace from the dropdown",
        },
        {
          step: "Step 3",
          title: "Create Your First Project",
          description: "Go to Projects > Click 'Create New Project' > Enter name",
        },
        {
          step: "Step 4",
          title: "Upload Your Code",
          description: "Upload ZIP file (or connect GitHub repo via Auto-Deploy)",
        },
        {
          step: "Step 5",
          title: "Deploy!",
          description: "Click 'Create & Deploy Project' and watch the magic happen",
        },
      ];

      setupSteps.forEach((item, index) => {
        checkAddPage(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text(item.step, 25, yPos);
        doc.setTextColor(0, 0, 0);
        doc.text(item.title, 45, yPos);
        yPos += 6;
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(item.description, 45, yPos, { maxWidth: 140 });
        yPos += index < setupSteps.length - 1 ? 10 : 5;
      });

      yPos += 5;

      // Section 3: Project Requirements
      checkAddPage(50);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("3. Project Requirements", 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Your project must have a package.json file at the root with:", 25, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("courier", "normal");
      doc.setFillColor(245, 245, 245);
      doc.rect(25, yPos - 3, 160, 30, "F");
      
      const codeLines = [
        '{',
        '  "name": "my-app",',
        '  "scripts": {',
        '    "build": "vite build"',
        '  },',
        '  "dependencies": { ... }',
        '}'
      ];
      
      codeLines.forEach((line) => {
        doc.text(line, 30, yPos);
        yPos += 4;
      });

      yPos += 8;

      // Supported Frameworks Table
      checkAddPage(50);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Supported Frameworks", 25, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [["Framework", "Build Command", "Output Folder"]],
        body: [
          ["Vite / React", "vite build", "dist/"],
          ["Next.js", "next build", ".next/"],
          ["Vue", "vite build", "dist/"],
          ["Svelte / SvelteKit", "vite build", "dist/"],
          ["Angular", "ng build", "dist/"],
          ["Astro", "astro build", "dist/"],
        ],
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229], fontSize: 10 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 70 },
          2: { cellWidth: 60 },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Section 4: Deployment Methods
      checkAddPage(40);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("4. Deployment Methods", 20, yPos);
      yPos += 10;

      const methods = [
        {
          title: "ZIP Upload (Easiest)",
          steps: [
            "Export your project as ZIP (exclude node_modules)",
            "Go to Projects > Create New Project",
            "Enter project name and upload ZIP",
            "Click 'Create & Deploy' - done!",
          ],
        },
        {
          title: "GitHub Repository",
          steps: [
            "Push your code to GitHub (public or private)",
            "Go to Auto-Deploy page",
            "Paste GitHub repository URL",
            "Click 'Deploy from GitHub'",
          ],
        },
      ];

      methods.forEach((method) => {
        checkAddPage(25);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(method.title, 25, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        method.steps.forEach((step, index) => {
          checkAddPage(6);
          doc.text(`${index + 1}. ${step}`, 30, yPos, { maxWidth: 150 });
          yPos += 5;
        });
        yPos += 3;
      });

      // Section 5: Common Issues
      checkAddPage(50);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("5. Troubleshooting Common Issues", 20, yPos);
      yPos += 10;

      const issues = [
        {
          problem: '"package.json not found"',
          solution: "Ensure package.json is at the root of your ZIP, not in a subfolder",
        },
        {
          problem: '"Vercel Not Connected"',
          solution: "Go to Settings and click 'Connect Vercel' to complete OAuth",
        },
        {
          problem: "Build fails with npm install error",
          solution: "Check your package.json for syntax errors or invalid dependencies",
        },
        {
          problem: "Deploy button is disabled",
          solution: "Verify: (1) Project name entered, (2) ZIP uploaded, (3) Vercel connected",
        },
      ];

      issues.forEach((issue) => {
        checkAddPage(15);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38); // Red
        doc.text("Problem:", 25, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(issue.problem, 48, yPos);
        yPos += 5;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(34, 197, 94); // Green
        doc.text("Solution:", 25, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(issue.solution, 135);
        doc.text(lines, 48, yPos);
        yPos += 5 * lines.length + 3;
      });

      // Section 6: Deployment Limits
      checkAddPage(40);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("6. Deployment Limits by Plan", 20, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [["Feature", "Free", "Pro ($19/mo)", "Business ($49/mo)"]],
        body: [
          ["Deployments/month", "5", "Unlimited", "Unlimited"],
          ["Build time", "15 min", "45 min", "45 min"],
          ["Support", "Community", "Priority", "Dedicated"],
          ["Team members", "1", "1", "5+"],
        ],
        theme: "grid",
        headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 35, halign: "center" },
          2: { cellWidth: 45, halign: "center" },
          3: { cellWidth: 45, halign: "center" },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Section 7: Best Practices
      checkAddPage(40);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("7. Best Practices for Success", 20, yPos);
      yPos += 10;

      const practices = [
        "Test your build locally first: Run 'npm install && npm run build'",
        "Keep ZIP files under 50 MB for faster uploads",
        "Exclude node_modules, .git, and dist folders from ZIP",
        "Use exact dependency versions for stability",
        "Check deployment logs if build fails",
        "Monitor your deployment limits on the Dashboard",
      ];

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      practices.forEach((practice, index) => {
        checkAddPage(8);
        doc.setTextColor(79, 70, 229);
        doc.text(`${index + 1}.`, 25, yPos);
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(practice, 155);
        doc.text(lines, 32, yPos);
        yPos += 6 * lines.length;
      });

      // Footer
      checkAddPage(20);
      yPos = 270;
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text("AI Deploy Agent - Deploy with Confidence", 105, yPos, { align: "center" });
      doc.text("Generated on " + new Date().toLocaleDateString(), 105, yPos + 5, { align: "center" });

      // Save
      doc.save("ai-deploy-agent-getting-started.pdf");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Getting Started Guide</h1>
          <p className="mt-2 text-slate-400">
            Everything you need to deploy your first app in 5 minutes
          </p>
        </div>
        <Button onClick={generatePDF} disabled={isGenerating} size="lg">
          {isGenerating ? (
            "Generating..."
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      {/* Quick Start Banner */}
      <Card className="border-indigo-500/50 bg-indigo-500/10">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-indigo-300">Ready to deploy?</h3>
            <p className="text-sm text-slate-400">
              Follow these steps to get your first app live in minutes
            </p>
          </div>
          <Link to="/dashboard/projects">
            <Button>Start Deploying</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Section 1: Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            1. What You Need
          </CardTitle>
          <CardDescription>
            Make sure you have these ready before starting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium">AI Deploy Agent Account</p>
              <p className="text-sm text-slate-400">Free signup - you're already logged in!</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium">Vercel Account</p>
              <p className="text-sm text-slate-400">
                Sign up for free at{" "}
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  vercel.com
                </a>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium">Your Project Code</p>
              <p className="text-sm text-slate-400">
                ZIP file or GitHub repository with package.json
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Setup Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-500" />
            2. Quick Setup (5 Minutes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "Connect Your Vercel Account",
                description: "Go to Settings and click 'Connect Vercel' to complete the OAuth flow",
                icon: <Zap className="h-5 w-5" />,
                link: "/dashboard/settings",
              },
              {
                step: "2",
                title: "Select Your Team",
                description: "Choose your personal or team workspace from the dropdown",
                icon: <CheckCircle className="h-5 w-5" />,
              },
              {
                step: "3",
                title: "Create Your First Project",
                description: "Go to Projects page and click 'Create New Project'",
                icon: <Upload className="h-5 w-5" />,
                link: "/dashboard/projects",
              },
              {
                step: "4",
                title: "Upload Your Code",
                description: "Upload a ZIP file or connect a GitHub repository",
                icon: <Github className="h-5 w-5" />,
              },
              {
                step: "5",
                title: "Deploy!",
                description: "Click 'Create & Deploy Project' and watch your app go live",
                icon: <Rocket className="h-5 w-5" />,
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">
                    Step {item.step}: {item.title}
                  </h4>
                  <p className="text-sm text-slate-400">{item.description}</p>
                  {item.link && (
                    <Link to={item.link}>
                      <Button variant="link" className="h-auto p-0 text-xs">
                        Go to {item.title.split(" ")[0]} →
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Project Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>3. Project Requirements</CardTitle>
          <CardDescription>Your project must include these essentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 font-semibold">Required: package.json</h4>
            <div className="rounded-lg bg-slate-900 p-4 font-mono text-sm">
              <pre className="text-slate-300">{`{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.0.0",
    "vite": "^5.0.0"
  }
}`}</pre>
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-semibold">Supported Frameworks</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                "Vite / React",
                "Next.js",
                "Vue",
                "Svelte / SvelteKit",
                "Angular",
                "Astro",
                "Remix",
                "Nuxt",
              ].map((framework) => (
                <div key={framework} className="flex items-center gap-2 rounded-lg border border-slate-800 p-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{framework}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Deployment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>4. Deployment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-400" />
                <h4 className="font-semibold">ZIP Upload (Easiest)</h4>
              </div>
              <ol className="space-y-2 text-sm text-slate-400">
                <li>1. Export project as ZIP (exclude node_modules)</li>
                <li>2. Go to Projects → Create New Project</li>
                <li>3. Enter name and upload ZIP</li>
                <li>4. Click "Create & Deploy" - done!</li>
              </ol>
            </div>

            <div className="rounded-lg border border-slate-800 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Github className="h-5 w-5 text-indigo-400" />
                <h4 className="font-semibold">GitHub Repository</h4>
              </div>
              <ol className="space-y-2 text-sm text-slate-400">
                <li>1. Push code to GitHub</li>
                <li>2. Go to Auto-Deploy page</li>
                <li>3. Paste GitHub URL</li>
                <li>4. Click "Deploy from GitHub"</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            5. Troubleshooting Common Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                problem: '"package.json not found"',
                solution: "Ensure package.json is at the root of your ZIP, not in a subfolder",
              },
              {
                problem: '"Vercel Not Connected"',
                solution: "Go to Settings and complete the Vercel OAuth connection",
              },
              {
                problem: "Build fails with npm install error",
                solution: "Check your package.json for syntax errors or invalid dependencies",
              },
              {
                problem: "Deploy button is disabled",
                solution:
                  "Verify: (1) Project name entered, (2) ZIP uploaded, (3) Vercel connected",
              },
            ].map((issue, index) => (
              <div key={index} className="rounded-lg border border-slate-800 p-4">
                <p className="mb-2 font-semibold text-red-400">❌ {issue.problem}</p>
                <p className="text-sm text-slate-400">✅ Solution: {issue.solution}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Plans */}
      <Card>
        <CardHeader>
          <CardTitle>6. Deployment Limits by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="pb-3 text-left">Feature</th>
                  <th className="pb-3 text-center">Free</th>
                  <th className="pb-3 text-center">Pro ($19/mo)</th>
                  <th className="pb-3 text-center">Business ($49/mo)</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-slate-800">
                  <td className="py-3">Deployments/month</td>
                  <td className="py-3 text-center text-slate-400">5</td>
                  <td className="py-3 text-center text-green-400">Unlimited</td>
                  <td className="py-3 text-center text-green-400">Unlimited</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-3">Build time</td>
                  <td className="py-3 text-center text-slate-400">15 min</td>
                  <td className="py-3 text-center text-slate-400">45 min</td>
                  <td className="py-3 text-center text-slate-400">45 min</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-3">Support</td>
                  <td className="py-3 text-center text-slate-400">Community</td>
                  <td className="py-3 text-center text-indigo-400">Priority</td>
                  <td className="py-3 text-center text-indigo-400">Dedicated</td>
                </tr>
                <tr>
                  <td className="py-3">Team members</td>
                  <td className="py-3 text-center text-slate-400">1</td>
                  <td className="py-3 text-center text-slate-400">1</td>
                  <td className="py-3 text-center text-green-400">5+</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <Link to="/dashboard/pricing">
              <Button>View Pricing Details</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="border-indigo-500/50 bg-indigo-500/10">
        <CardContent className="py-8 text-center">
          <h3 className="mb-2 text-xl font-bold">Ready to Deploy?</h3>
          <p className="mb-6 text-slate-400">
            Start deploying your applications in minutes
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/dashboard/projects">
              <Button size="lg">
                <Rocket className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
            <Button size="lg" variant="outline" onClick={generatePDF}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF Guide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
