import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { highlightText, injectHighlightMarkup, HIGHLIGHT_CLASS } from '../modules/highlightText';
import 'github-markdown-css/github-markdown.css';

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  json: 'json',
  css: 'css',
  scss: 'scss',
  html: 'html',
  md: 'markdown',
  markdown: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'bash',
  bash: 'bash',
  sql: 'sql',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
};

function getLanguageFromFilename(filename: string): string {
  const ext = filename.replace(/^.*\./, '').toLowerCase();
  return EXT_TO_LANG[ext] ?? ext;
}

function isMarkdownFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.markdown');
}

const MONO_STYLE: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  fontSize: '13px',
  lineHeight: '1.45',
};

interface FileContentBlockProps {
  content: string;
  filename?: string;
  /** AI가 추출한 질문 연결 문장/코드 (배경색 하이라이트) */
  highlightStrings?: string[];
}

/**
 * 파일 원문을 마크다운 또는 코드 하이라이트로 렌더링
 * .md/.markdown → ReactMarkdown, 그 외 확장자 → SyntaxHighlighter
 */
const FileContentBlock: React.FC<FileContentBlockProps> = ({ content, filename = '', highlightStrings }) => {
  if (isMarkdownFile(filename)) {
    const contentToRender =
      highlightStrings && highlightStrings.length > 0
        ? injectHighlightMarkup(content, highlightStrings, HIGHLIGHT_CLASS)
        : content;
    return (
      <div className="markdown-body w-full h-full overflow-y-auto p-6 box-border text-left bg-white">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              if (!inline && match) {
                return (
                  <SyntaxHighlighter
                    style={github}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{ margin: '0.5em 0', borderRadius: '6px', fontSize: '13px' }}
                    codeTagProps={{
                      style: {
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                      },
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                );
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {contentToRender}
        </ReactMarkdown>
      </div>
    );
  }

  const language = getLanguageFromFilename(filename) || 'text';
  const lines = content.split('\n');
  const hasHighlights = highlightStrings && highlightStrings.length > 0;

  if (hasHighlights) {
    return (
      <div className="w-full h-full overflow-auto p-4 bg-slate-50 rounded-b-3xl border border-slate-200 border-t-0 box-border">
        <pre className="m-0 overflow-x-auto" style={MONO_STYLE}>
          <code style={MONO_STYLE}>
            {lines.map((line, i) => (
              <div key={i} className="block">
                {highlightText(line, highlightStrings!)}
              </div>
            ))}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto p-4 bg-slate-50 rounded-b-3xl border border-slate-200 border-t-0 box-border">
      <SyntaxHighlighter
        style={github}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: 0,
          background: 'transparent',
          fontSize: '13px',
          lineHeight: '1.45',
        }}
        codeTagProps={{
          style: MONO_STYLE,
        }}
        showLineNumbers={lines.length > 5}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

export default FileContentBlock;
