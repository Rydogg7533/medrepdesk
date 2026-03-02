import clsx from 'clsx';

export default function Card({ children, className, ...rest }) {
  return (
    <div
      className={clsx(
        'rounded-xl bg-white p-6 shadow-md dark:bg-gray-800 dark:shadow-gray-900/20',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
