'use strict'  
const User = use('App/Models/User')
const Translate = use('Services/Translate')

class UserController {
  constructor () {
    this.language = 'en_US'
  }

  async index () {
    const data = await User.query().Activated().fetch()
    return data
  }

  async show ({ params, response, request }) {
    this.language = request.header('Accept-Language', 'en_US')
    const data = await User.query().with('roles').with('permissions').Activated().where({ id: params.id }).first()
    if (!data) {
      return response.status(404).send({ error: { message: await Translate.getTranslate(this.language, 'User not exist/active'), name: 'NotFound', status: 404 } })
    }

    data.password = null
    return data
  }

  async store ({ request }) {
    const { permissions, roles, ...data } = request.only([
      'username',
      'name',
      'email',
      'password',
      'dados_pessoais_id',
      'permissions',
      'roles'
    ])

    const user = await User.create(data)

    if (permissions) {
      await user.permissions().attach(permissions)
    }

    if (roles) {
      await user.roles().attach(roles)
    }

    await user.loadMany(['roles', 'permissions'])
    return user
  }

  //email retirado
  async update ({ request, params, response }) {
    const { permissions, roles, ...data } = request.only([
      'password',
      'dados_pessoais_id',
      'permissions',
      'roles'
    ])

    const user = await User.findOrFail(params.id)
    if (!user.active) {
      return response.status(400).send({ error: { message: await Translate.getTranslate(this.language, 'User has been deleted from the system'), name: 'DataDeleted', status: 400 } })
    }

    user.merge(data)
    await user.save()

    if (permissions) {
      await user.permissions().sync(permissions)
    }

    if (roles) {
      await user.roles().sync(roles)
    }

    await user.loadMany(['roles', 'permissions'])

    return user
  }

  async destroy ({ params }) {
    const user = await User.findOrFail(params.id)
    await user.merge({ active: 0 })
    return user.save()
  }

  async hasPermission ({ params }) {
    const { userId, permission } = params
    const user = await User.findOrFail(userId)
    const hasPermission = await user.can(permission)
    const notAllowed = await user.can(`${permission}_NOT`)
    if (notAllowed) {
      return false
    }
 
    return hasPermission
  }
  
  async hasRole ({ params }) {
    const { userId, role } = params
    const user = await User.findOrFail(userId)
    const hasRole = await user.is(role)
    return hasRole
  }
}

module.exports = UserController

