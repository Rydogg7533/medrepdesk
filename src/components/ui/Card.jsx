import clsx from 'clsx';

export default function Card({ children, className }) {
  return (
    <div className={clsx('rounded-xl bg-white p-6 shadow-md', className)}>
      {children}
    </div>
  );
}
