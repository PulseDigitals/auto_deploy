import { useState } from "react";
import { FileIcon, FolderIcon, FolderOpenIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";

type Artifact = {
  path: string;
  type: string;
  content?: string;
  size?: number;
};

type ArtifactExplorerProps = {
  artifacts?: Artifact[];
};

type FileNode = {
  name: string;
  path: string;
  type: string;
  size?: number;
  content?: string;
  children?: Record<string, FileNode>;
};

function buildFileTree(artifacts: Artifact[]): FileNode[] {
  const root: Record<string, FileNode> = {};

  artifacts.forEach((artifact) => {
    const parts = artifact.path.split("/");
    let current = root;

    parts.forEach((part, idx) => {
      if (!current[part]) {
        current[part] = {
          name: part,
          path: parts.slice(0, idx + 1).join("/"),
          type: idx === parts.length - 1 ? artifact.type : "folder",
          size: idx === parts.length - 1 ? artifact.size : undefined,
          content: idx === parts.length - 1 ? artifact.content : undefined,
          children: {},
        };
      }
      if (idx < parts.length - 1) {
        current = current[part].children!;
      }
    });
  });

  return Object.values(root);
}

function FileTreeNode({
  node,
  level,
  onFileClick,
}: {
  node: FileNode;
  level: number;
  onFileClick: (file: FileNode) => void;
}) {
  const [isOpen, setIsOpen] = useState(level === 0);

  const isFolder = node.type === "folder";
  const childArray = node.children ? Object.values(node.children) : [];

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-slate-800 ${
          level > 0 ? `ml-${level * 4}` : ""
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (isFolder) {
            setIsOpen(!isOpen);
          } else {
            onFileClick(node);
          }
        }}
      >
        {isFolder && (
          <div className="text-slate-400">
            {isOpen ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </div>
        )}
        {isFolder ? (
          isOpen ? (
            <FolderOpenIcon className="h-4 w-4 text-blue-400" />
          ) : (
            <FolderIcon className="h-4 w-4 text-blue-400" />
          )
        ) : (
          <FileIcon className="h-4 w-4 text-slate-400" />
        )}
        <span className="text-sm">{node.name}</span>
        {!isFolder && node.size && (
          <span className="text-xs text-slate-500 ml-auto">({node.size} KB)</span>
        )}
      </div>
      {isFolder && isOpen && childArray.length > 0 && (
        <div>
          {childArray.map((child) => (
            <FileTreeNode key={child.path} node={child} level={level + 1} onFileClick={onFileClick} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArtifactExplorer({ artifacts }: ArtifactExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center py-8">
        Artifacts will be available after a successful deployment.
      </div>
    );
  }

  const fileTree = buildFileTree(artifacts);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* File Tree */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 h-80 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 mb-2">BUILD OUTPUT</div>
        {fileTree.map((node) => (
          <FileTreeNode key={node.path} node={node} level={0} onFileClick={setSelectedFile} />
        ))}
      </div>

      {/* File Preview */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 h-80 overflow-y-auto">
        {selectedFile ? (
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-1">
              FILE: {selectedFile.path}
            </div>
            {selectedFile.size && (
              <div className="text-xs text-slate-500 mb-3">Size: {selectedFile.size} KB</div>
            )}
            {selectedFile.content ? (
              <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                {selectedFile.content}
              </pre>
            ) : (
              <div className="text-sm text-slate-500">No preview available</div>
            )}
          </div>
        ) : (
          <div className="text-sm text-slate-500 text-center py-8">
            Click a file to preview its contents
          </div>
        )}
      </div>
    </div>
  );
}
