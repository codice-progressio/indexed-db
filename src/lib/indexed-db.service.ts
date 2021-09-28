import { Injectable } from "@angular/core"
import { Observable } from "rxjs"

@Injectable({
  providedIn: "root",
})
export class IndexedDBService {
  debug = false

  constructor() {}

  /**
   * *Inicializamos la conexion a IndexedDB
   * Para abstraer mas este servicio separamos las opciones generales de la BD
   * con las de ObjectStore
   *
   *
   * @param {IDBOpciones} opciones Las opciones de inicializacion de la BD
   * @param {IDBOpcionesObjectStore[]} iDBOpcionesObjectStore Las opciones de cada ObjectSotre en un arreglo para inicializarlas todas juntas.
   * @returns {Observable<this>}Retorna este servicio.
   * @memberof IndexedDBService
   */
  inicializar(
    opciones: IDBOpciones,
    iDBOpcionesObjectStore: IDBOpcionesObjectStore[]
  ): Observable<IDBDatabase> {
    return new Observable(subscriber => {
      // Comprobamos si el navegador es compatible
      const indexDB = window.indexedDB
      this.consoleLog("[ INICIALIZAR ] Navegador compatible: ", !!indexDB)

      if (indexDB) {
        this.consoleLog(
          "[ INICIALIZAR ] Incializando con estas opciones:",
          iDBOpcionesObjectStore
        )

        this.consoleLog("[ INICIALIZAR ] Abriendo conexion...")
        const request = indexDB.open(opciones.nombreBD, opciones.version)
        request.onsuccess = () => {
          this.consoleLog(`[ INICIALIZAR ] Operacion realizada...`)
          let db = request.result
          subscriber.next(db)
          subscriber.complete()
        }

        request.onupgradeneeded = (e: any) => {
          this.consoleLog(
            `[ INICIALIZAR ] Configurando base de datos...`,
            iDBOpcionesObjectStore
          )

          let db = request.result

          iDBOpcionesObjectStore.forEach(obs => {
            this.consoleLog(
              "[ INICIALIZAR ] Creando objectStore: ",
              obs.opciones.objectStore
            )
            this.consoleLog(
              "[ INICIALIZAR ] Asignando keypath: ",
              obs.opciones.keyPath
            )
            db.createObjectStore(obs.opciones.objectStore, {
              keyPath: obs.opciones.keyPath,
            })
          })

          let transaction = e.target.transaction
          transaction.oncomplete = () => {
            this.consoleLog(
              "[ INICIALIZAR ] Configuracion terminada con exito..."
            )

            subscriber.next()
            subscriber.complete()
          }
        }

        request.onerror = error => {
          this.consoleLog("[ INICIALIZAR ] Hubo un error...", error)
          subscriber.error(error)
        }
      } else {
        this.consoleLog(
          "[ INICIALIZAR ] Navegador no compatible con indexedDB..."
        )
        subscriber.error("Hubo un error")
      }
    })
  }

  /**
   *Guarda un dato del tipo que se le pase
   *
   * @template T
   * @param {T} data
   * @param {string} tabla
   * @returns {Observable<this>}
   * @memberof IndexedDBService
   */
  save<T>(data: T, tabla: string, db: IDBDatabase): Observable<this> {
    return new Observable(subscriber => {
      this.consoleLog("[ SAVE ] Guardando datos en ", tabla, data)
      const request = this.objectStore(tabla, db).add(data)

      request.onsuccess = () => {
        this.consoleLog("[ SAVE ] Datos almacenados con exito")
        subscriber.next(this)
        subscriber.complete()
      }

      request.onerror = err => {
        let msjError = err.target["error"]
        console.error("[ SAVE ] Error en save: ", msjError, data)
        subscriber.error(msjError)
      }
    })
  }

  /**
   *Busca los elementos existentes para paginarlos
   *
   * @template T El tipo de dato a recibir
   * @param {string} tabla El nombre de la tabla de la cual se van a listar los datos.
   * @param {IDBDatabase} db La base de datos seleccionada
   * @param {{
   *       skip: number;
   *       limit: number;
   *     }} [paginacion={
   *       skip: 0,
   *       limit: 30,
   *     }]
   * @returns {Observable<T[]>} Retorna un observable con los datos deseados.
   * @memberof IndexedDBService
   */
  find<T>(
    tabla: string,
    db: IDBDatabase,
    paginacion: {
      skip: number
      limit: number
    } = {
      skip: 0,
      limit: 30,
    }
  ): Observable<T[]> {
    let datos: T[] = []
    return new Observable<T[]>(subscriber => {
      this.consoleLog("Buscando todos los datos:", { tabla, paginacion })

      if (paginacion.skip < 0) paginacion.skip = 0

      let request = this.objectStore(tabla, db).openCursor()
      let contador = 0
      let hasSkipped = false

      request.onsuccess = (e: any) => {
        this.consoleLog("[ FIND ALL ] Elemento cargado: ", contador)
        let cursor = e.target.result

        //Aqui el skip funciona como contador, no es necesario 
        // tomar en cuenta el 0 por que se saltaria 0 posiciones y
        // cursor.advance no acepta 0 como una posición, por lo tanto
        // si paginacion.skip == 0 entonces no entramos. 
        if (!hasSkipped && paginacion.skip > 0) {
          hasSkipped = true
          cursor.advance(paginacion.skip)
          return
        }
        if (cursor && contador < paginacion.limit) {
          datos.push(cursor.value)
          cursor.continue()
          contador++
          console.log({ contador, paginacion })
        } else {
          console.log("sale")
          subscriber.next(datos)
          subscriber.complete()
        }
      }

      request.onerror = err => {
        console.error("[ FIND ALL ]  Error en findAll: ", err)
        subscriber.error(err)
      }
    })
  }

  /**
   *Busca un elemento por su id.
   *
   * @template T
   * @param {string} tabla
   * @param {IDBDatabase} db
   * @param {*} id
   * @returns {Observable<any>}
   * @memberof IndexedDBService
   */
  findById<T>(tabla: string, db: IDBDatabase, id: any): Observable<T> {
    return new Observable<T>(subscriber => {
      this.consoleLog("[ FIND_BY_ID ] Buscando por id: ", id, tabla)

      const request = this.objectStore(tabla, db).get(id)

      request.onsuccess = () => {
        this.consoleLog("[ FIND_BY_ID ] Se encontro el objeto...")
        subscriber.next(request.result)
        subscriber.complete()
      }

      request.onerror = err => {
        console.error("[ FIND_BY_ID ] Error en findById: ", id, err)
        subscriber.error(err)
      }
    })
  }

  update<T>(data: T, tabla: string, db: IDBDatabase): Observable<this> {
    return new Observable(subscriber => {
      this.consoleLog("[ UPDATE ] Actualizando datos: ", data, tabla)
      const request = this.objectStore(tabla, db).put(data)

      request.onsuccess = () => {
        this.consoleLog("[ UPDATE ] Datos actualizados correctamente...")
        subscriber.next(this)
        subscriber.complete()
      }

      request.onerror = err => {
        console.error("[ UPDATE ] Error en update: ", data, err)
        subscriber.error(err)
      }
    })
  }

  delete(tabla: string, db: IDBDatabase, id: any): Observable<this> {
    return new Observable<null>(subscriber => {
      this.consoleLog("[ DELETE ] Eliminado datos: ", id, tabla)
      const request = this.objectStore(tabla, db).delete(id)

      request.onsuccess = () => {
        this.consoleLog("[ DELETE ] Se elimino correctamente...")
        subscriber.next()
        subscriber.complete()
      }

      request.onerror = err => {
        console.error("[ DELETE ] Error en delete: ", id, err)
        subscriber.error(err)
      }
    })
  }

  /**
   *Elimina todos los datos del objectStore
   *
   * @param {IDBOpcionesObjectStore} tabla El objectStore a limpiar.
   * @returns {Observable<this>} Retorna este servicio
   * @memberof IndexedDBService
   */
  deleteAll(tabla: string, db: IDBDatabase): Observable<this> {
    return new Observable(subscriber => {
      this.consoleLog("[ DELETE ] Eliminado todos los datos: ", tabla)
      const request = this.objectStore(tabla, db).clear()

      request.onsuccess = () => {
        this.consoleLog("[ DELETE ] Se elimino todo correctamente...")
        subscriber.next(this)
        subscriber.complete()
      }

      request.onerror = err => {
        console.error("[ DELETE ] Error en deleteAll: ", err)
        subscriber.error(err)
      }
    })
  }

  /**
   *Permite contar los datos de la tabla
   *
   * @param {string} tabla El nombre de la tabla
   * @param {IDBDatabase} db La BD que se inicializo previamente
   * @returns El total de elementos existentes en la tabla.
   * @memberof IndexedDBService
   * @deprecated "Remplazar por contar datos"
   */
  contarDatosEnTabla(tabla: string, db: IDBDatabase) {
    return new Promise<number>((resolve, reject) => {
      this.objectStore(tabla, db).count().onsuccess = function (e) {
        resolve(e.target["result"])
      }
    })
  }

  contarDatos(tabla: string, db: IDBDatabase): Observable<number> {
    return new Observable(subscriber => {
      this.consoleLog("[ COUNT ] Contando datos en tabla: ", tabla)
      const request = this.objectStore(tabla, db).count()

      request.onsuccess = e => {
        console.log("esto es lo que me interesa", e.target["result"])
        subscriber.next(e.target["result"])
        subscriber.complete()
      }

      request.onerror = err => {
        console.error("[ COUNT ] Error en contarDatos: ", err)
        subscriber.error(err)
      }
    })
  }

  private consoleLog(...args) {
    if (this.debug) {
      console.log(...args)
    }
  }

  /**
   *Obtiene el objectStore, que seria el equivalente a una colleccion en mongodb pero con una convinacion de request. ????
   *
   * @private
   * @param {string} objectStore El nombre del objectStore
   * @param {IDBDatabase} db La BD inicializada
   * @returns {IDBObjectStore} El objeto para aplicar las transacciones
   * @memberof IndexedDBService
   */
  private objectStore(
    objectStore: string,
    db: IDBDatabase,
    modo: "readwrite" | "readonly" = "readwrite"
  ): IDBObjectStore {
    //Se repite el object store
    this.consoleLog("[ OBJECT STORE ] Obteniendo objectoStore: ", objectStore)
    let transaction = db.transaction([objectStore], modo)
    this.consoleLog("[ OBJECT STORE ] Se obtuvo el objectStore:", transaction)
    return transaction.objectStore(objectStore)
  }
}

/**
 *Guarda los datos necesarios para crear una base de datos.
 *
 * @export
 * @class IDBOpciones
 */
export class IDBOpciones {
  constructor(
    public nombreBD: string = "default",
    public version: number = 1
  ) {}
}

/**
 *Crea un objeto que almacena la informacion necesarioa para gestionar un object store
 *
 * @export
 * @class IDBOpcionesObjectStore
 */
export class IDBOpcionesObjectStore {
  /**
   *Gestiona las opciones para el objectostore.
   * @param {string} [objectStore='defaultObjectStore'] El nombre del objecstore deseado
   * @param {string} [keyPath='defaultKeyPath'] El key del objeto que se usara como key en el objecstore, por ejemeplo un campo `_id`
   * @memberof IDBOpcionesObjectStore
   */
  constructor(
    public opciones: {
      objectStore: string
      keyPath: string
    } = { objectStore: "defaultObjectStore", keyPath: "defaultKeyPath" }
  ) {}
}
