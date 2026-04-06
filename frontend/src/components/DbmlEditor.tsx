'use client';

import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';

interface DbmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  searchQuery?: string;
  searchNonce?: number;
}

export function DbmlEditor({ value, onChange, readOnly = false, height = '600px', searchQuery, searchNonce }: DbmlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const workersConfiguredRef = useRef(false);

  const ensureMonacoWorkers = () => {
    if (workersConfiguredRef.current || typeof window === 'undefined') {
      return;
    }

    (self as unknown as { MonacoEnvironment?: monaco.Environment }).MonacoEnvironment = {
      getWorker: (_moduleId: string, label: string) => {
        if (label === 'json') {
          return new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker', import.meta.url));
        }

        if (label === 'css' || label === 'scss' || label === 'less') {
          return new Worker(new URL('monaco-editor/esm/vs/language/css/css.worker', import.meta.url));
        }

        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return new Worker(new URL('monaco-editor/esm/vs/language/html/html.worker', import.meta.url));
        }

        if (label === 'typescript' || label === 'javascript') {
          return new Worker(new URL('monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url));
        }

        return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url));
      }
    };

    workersConfiguredRef.current = true;
  };

  useEffect(() => {
    if (!editorRef.current) return;

    ensureMonacoWorkers();

    const editor = monaco.editor.create(editorRef.current, {
      value,
      language: 'sql', // Using SQL for syntax highlighting (DBML is similar)
      theme: 'vs-dark',
      readOnly,
      automaticLayout: true,
      minimap: { enabled: true },
      wordWrap: 'on',
      fontSize: 13,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      folding: true,
      bracketPairColorization: { enabled: true },
    });

    monacoEditorRef.current = editor;

    const handleChange = () => {
      onChange(editor.getValue());
    };

    editor.onDidChangeModelContent(handleChange);

    return () => {
      editor.dispose();
    };
  }, []);

  useEffect(() => {
    const editor = monacoEditorRef.current;
    const query = searchQuery?.trim();

    if (!editor || !query) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    const matches = model.findMatches(query, true, false, false, null, true);
    if (matches.length === 0) {
      return;
    }

    const firstMatch = matches[0].range;
    editor.setSelection(firstMatch);
    editor.revealRangeInCenter(firstMatch, monaco.editor.ScrollType.Smooth);
    editor.focus();
  }, [searchQuery, searchNonce]);

  return (
    <div
      ref={editorRef}
      style={{ height, width: '100%', border: '1px solid #ddd', borderRadius: '4px' }}
    />
  );
}
