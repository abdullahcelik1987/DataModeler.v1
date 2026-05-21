export function getStandardTabClass(isActive: boolean): string {
  return `dm-tab whitespace-nowrap ${
    isActive
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
  }`;
}
