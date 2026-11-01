import { Link } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/Primitives'
import { LogoMark } from '@/components/Logo'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <LogoMark size={64} />
      <h1 className="mt-6 font-display text-3xl font-bold">{t('error.notFound')}</h1>
      <p className="mt-2 text-cloud-500">{t('error.notFoundBody')}</p>
      <Link to="/home" className="mt-6">
        <Button>{t('nav.home')}</Button>
      </Link>
    </div>
  )
}
