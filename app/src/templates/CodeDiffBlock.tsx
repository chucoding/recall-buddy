import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import 'github-markdown-css/github-markdown.css';

interface CodeDiffBlockProps {
  diffContent: string;
}

const CodeDiffBlock: React.FC<CodeDiffBlockProps> = ({ diffContent }) => {
  return (
    <div className="markdown-body code-diff-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const isDiff = match && match[1] === 'diff';
            
            if (!inline && match) {
              if (isDiff) {
                // diff 코드용 커스텀 렌더링
                return (
                  <div className="my-3 border border-[#d0d7de] rounded-md overflow-hidden">
                    <SyntaxHighlighter
                      style={github}
                      language="diff"
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        borderRadius: '6px',
                        fontSize: '13px',
                        lineHeight: '1.45',
                      }}
                      codeTagProps={{
                        style: {
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                        }
                      }}
                      lineProps={(lineNumber) => {
                        const lineContent = String(children).split('\n')[lineNumber - 1] || '';
                        const style: React.CSSProperties = { display: 'block' };
                        
                        if (lineContent.startsWith('+') && !lineContent.startsWith('+++')) {
                          style.backgroundColor = 'rgba(46, 160, 67, 0.15)';
                          style.borderLeft = '3px solid #2ea043';
                        } else if (lineContent.startsWith('-') && !lineContent.startsWith('---')) {
                          style.backgroundColor = 'rgba(248, 81, 73, 0.15)';
                          style.borderLeft = '3px solid #f85149';
                        } else if (lineContent.startsWith('@@')) {
                          style.backgroundColor = 'rgba(84, 174, 255, 0.15)';
                          style.fontWeight = '600';
                        }
                        
                        return { style };
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                );
              }
              
              // 일반 코드 블록
              return (
                <SyntaxHighlighter
                  style={github}
                  language={match[1]}
                  PreTag="div"
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
          h2: ({ children }) => (
            <h2 className="text-[1.5em] font-semibold mt-6 mb-4 border-b border-[#d0d7de] pb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[1.25em] font-semibold mt-5 mb-3 text-[#24292f]">
              📄 {children}
            </h3>
          ),
          strong: ({ children }) => {
            const text = String(children);
            let colorClass = 'text-[#24292f]';
            
            if (text.includes('Status')) {
              colorClass = 'text-[#0969da]';
            } else if (text.includes('Changes')) {
              colorClass = 'text-[#8250df]';
            }
            
            return (
              <strong className={colorClass}>
                {children}
              </strong>
            );
          },
        }}
      >
        {diffContent}
      </ReactMarkdown>
      
    </div>
  );
};

export default CodeDiffBlock;
