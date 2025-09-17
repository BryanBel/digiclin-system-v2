import { Button, Card } from '@heroui/react';

export default function DashboardCard({
  icon: Icon,
  title,
  description,
  buttonText,
  onButtonClick,
  themeColor = 'blue', // tema por defecto
}) {
  const themeClasses = {
    blue: {
      border: 'border-blue-400',
      icon: 'text-blue-500',
      title: 'text-blue-700',
      button: 'bg-blue-500 hover:bg-blue-600',
    },
    green: {
      border: 'border-green-400',
      icon: 'text-green-500',
      title: 'text-green-700',
      button: 'bg-green-500 hover:bg-green-600',
    },
    purple: {
      border: 'border-purple-400',
      icon: 'text-purple-500',
      title: 'text-purple-700',
      button: 'bg-purple-500 hover:bg-purple-600',
    },
  };

  const currentTheme = themeClasses[themeColor] || themeClasses.blue;

  return (
    <Card className={`shadow-xl bg-white/80 border-t-4 ${currentTheme.border}`}>
      <div className="flex items-center gap-4 mb-3">
        <Icon className={`h-10 w-10 ${currentTheme.icon}`} />
        <h2 className={`text-2xl font-semibold ${currentTheme.title}`}>{title}</h2>
      </div>
      <p className="text-gray-700 mb-6">{description}</p>
      <Button
        onClick={onButtonClick}
        className={`w-full text-white ${currentTheme.button}`}
      >
        {buttonText}
      </Button>
    </Card>
  );
}