import { useI18n } from '../../contexts/I18nContext'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import './GdprModal.css'

const SECTIONS = [
  {
    title: '1. Suppression du compte',
    items: [
      'Votre compte est immédiatement désactivé sur demande.',
      'Les sessions actives et tokens sont révoqués.',
      'Votre profil devient inaccessible publiquement.',
      'Vos données ne sont pas supprimées immédiatement afin de permettre une récupération.',
    ],
  },
  {
    title: '2. Période de récupération (30 jours)',
    items: [
      'Votre compte est marqué pour suppression.',
      'Vous pouvez restaurer votre compte dans un délai de 30 jours.',
      'Aucune activité publique n\'est visible durant cette période.',
    ],
  },
  {
    title: '3. Suppression définitive et anonymisation',
    items: [
      'Après 30 jours : vos données personnelles sont supprimées de la base de données principale.',
      'Certaines données peuvent être anonymisées à des fins de statistiques, de sécurité, d\'amélioration du service ou d\'obligations légales.',
    ],
  },
  {
    title: '4. Sauvegardes et backups',
    items: [
      'Les sauvegardes chiffrées peuvent temporairement contenir vos données.',
      'Durée de conservation : 30 à 90 jours maximum.',
      'Supprimées ou écrasées automatiquement.',
      'Non utilisées à des fins commerciales.',
    ],
  },
  {
    title: '5. Données analytiques',
    items: [
      'Seules des données anonymisées ou agrégées sont conservées.',
      'Aucune identification n\'est possible après la suppression.',
    ],
  },
  {
    title: '6. Sécurité',
    items: [
      'Protection contre les accès non autorisés.',
      'Restriction des accès internes.',
      'Sauvegardes sécurisées et traitement automatisé.',
    ],
  },
  {
    title: '7. Conformité',
    items: [
      'Cette politique est conforme au Règlement Général sur la Protection des Données (RGPD / GDPR) de l\'Union Européenne.',
    ],
  },
]

export default function GdprModal({ open, onAccept, onRefuse }) {
  const { t } = useI18n()

  return (
    <Modal open={open} onClose={() => {}} title={t.auth.gdpr_title}>
      <div className="gdpr-body">
        <p className="gdpr-intro">{t.auth.gdpr_intro}</p>

        <div className="gdpr-sections">
          {SECTIONS.map((section) => (
            <div key={section.title} className="gdpr-section">
              <h4 className="gdpr-section-title">{section.title}</h4>
              <ul className="gdpr-list">
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="gdpr-actions">
          <Button variant="primary" onClick={onAccept}>
            {t.auth.gdpr_accept}
          </Button>
          <Button variant="ghost" onClick={onRefuse}>
            {t.auth.gdpr_refuse}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
