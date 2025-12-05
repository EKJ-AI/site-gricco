// =============================================
// File: Backend – contrato sugerido do /api/auth/me (para alinhar front/back)
// =============================================
// Resposta esperada:
// {
// success: true,
// user: { id, name, email, profileId },
// permissions: ["dashboard.view", "user.view", "permission.manage", ...]
// }
// No backend você já tem req.user.profileId. Basta consultar o perfil e mapear as permissions
// exatamente como já faz no authorizePermissions, e retornar esse array no /me.


// =============================================
// File: Exemplo de uso no menu (condicional por permissão)
// =============================================
import React from 'react'
import { Link } from 'react-router-dom'
import { usePermission } from '../../../shared/hooks/usePermission'


export default function Sidebar() {
    const can = usePermission()
    console.log("PERMISSAO: ", can);
    return (
        <aside>
            <ul>
                {can({ all: ["user.view"] }) && (
                    <li><Link to="/dashboard">Dashboard</Link></li>
                )}
                {can({ all: ["user.view"] }) && (
                    <li><Link to="/users">Usuários</Link></li>
                )}
                {can({ all: ["permission.manage"] }) && (
                    <li><Link to="/permissions">Permissões</Link></li>
                )}
                {can({ any: ["profile.manage", "settings.manage"] }) && (
                    <li><Link to="/settings">Configurações</Link></li>
                )}
            </ul>
        </aside>
    )
}