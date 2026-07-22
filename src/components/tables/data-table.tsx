export function DataTable({ headers, rows }: Readonly<{ headers: readonly string[]; rows: readonly (readonly string[])[] }>) {
  return <table><thead><tr>{headers.map((header)=><th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{row.map((cell)=><td key={cell}>{cell}</td>)}</tr>)}</tbody></table>;
}
