interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`max-w-6xl mx-auto h-full ${className}`}>
      {children}
    </div>
  );
}
