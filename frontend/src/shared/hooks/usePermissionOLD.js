import { useAuth } from '../../modules/auth/contexts/AuthContext'
export function usePermission() {
    const { hasPermissions } = useAuth()
    return ({ all = [], any = [] } = {}) => {
        const okAll = all.length ? hasPermissions(all) : true
        const okAny = any.length ? hasPermissions(any, { any: true }) : true
        return okAll && okAny
    }
}