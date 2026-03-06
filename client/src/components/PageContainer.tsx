interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`md:max-w-6xl mx-auto h-full px-4 md:px-0 ${className}`}>
      {children}
    </div>
  );
}
