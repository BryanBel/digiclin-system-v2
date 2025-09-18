import { Button, Card } from '@heroui/react';

export default function DashboardCard({
  icon: Icon,
  title,
  description,
  buttonText,
  onButtonClick,
  themeColor = 'blue', // tema por defecto
  bgColorClass, // Nueva prop para la clase de fondo
}) {
  const themeClasses = {
    blue: {
      border: 'border-blue-400',
      icon: 'text-blue-500',
      title: 'text-blue-700',
      button: 'bg-blue-500 hover:bg-blue-600',
      background: 'bg-gradient-to-br from-blue-100 via-blue-300 to-blue-500', // Degradado azul
    },
    green: {
      border: 'border-green-400',
      icon: 'text-green-500',
      title: 'text-green-700',
      button: 'bg-green-500 hover:bg-green-600',
      background: 'bg-gradient-to-br from-green-100 via-green-300 to-green-500', // Degradado verde
    },
    purple: {
      border: 'border-purple-400',
      icon: 'text-purple-500',
      title: 'text-purple-700',
      button: 'bg-purple-500 hover:bg-purple-600',
      background: 'bg-gradient-to-br from-purple-100 via-purple-300 to-purple-500', // Degradado morado
    },
  };

  const currentTheme = themeClasses[themeColor] || themeClasses.blue;

  return (
    <Card className={`shadow-xl ${currentTheme.background} border-t-4 ${currentTheme.border}`}>
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