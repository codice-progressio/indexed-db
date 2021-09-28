# Indexed-DB

Helper limpio y sencillo para Angular.

### Instalación

> `npm i @codice-progressio/indexed-db`

### Uso

Agrega el modulo donde lo necesites.

```javascript
import { IndexedDBModule } from "@codice-progressio/indexed-db"

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, FormsModule, IndexedDBModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

> ## Algunas importaciones utiles
>
> ```typescript
> import {
>   IDBOpciones,
>   IndexedDBService,
>   IDBOpcionesObjectStore,
> } from "@codice-progressio/indexed-db"
> ```

Inyecta `IndexedDBService` en el componente o servicio donde vayas a trabajar e inicializa la BD.

> Es necesario crear varias instancias para poder manejar multiples BD.

```typescript

  constructor(private indexedDBService: IndexedDBService) {
    this.inicializarIndexedDB();

    //Escuchamos si la BD esta lista.
    this.escucharBD()
  }

  escucharBD() {
    this.indexedDBService.db_event.subscribe((db) => {
      this.cargarDatos(this.paginacion);
    });
  }

  inicializarIndexedDB() {
    //Habilita el debugueo.
    this.idb.debug = true;

    // Definimos las opciones
    let opciones = new IDBOpciones();
    opciones.nombreBD = 'NICE_AND_EASY[MAYBE_CRAZY]LOCAL_BD';
    // opciones.version esta disponible tambien

    // Creamos las tablas que vamos a necesitar y el
    // keyPath con el cual vamos a registrar cada dato
    let tablas = [
      new IDBOpcionesObjectStore({ objectStore: 'contactos', keyPath: 'id' }),
    //   new IDBOpcionesObjectStore({ objectStore: 'tabla2', keyPath: 'id' }),
    ];

    this.idb.inicializar(opciones, tablas).subscribe((bd) => {
      console.log('Indexed-DB inicializado');
    });
  }

```

## Grabar datos

```typescript
  agregarDato(con: Contacto) {
    console.log('agregar dato', con);
    if (con.id) {
      this.update(con);
      return;
    }

    con.id = Math.trunc(Math.random() * 10000000);
    this.indexedDBService.save<Contacto>(con, 'contactos').subscribe(
      (servicio) => {
        //Reiniciamos el objeto por que no cambiamos de pagina
        con.id = null;
        con.nombre = '';
        con.telefono = '';
        this.contacto.telefono = '';
        this.contacto.nombre = '';
        //Contamos los datos de nuevo
        this.indexedDBService.contarDatos('contactos').subscribe(
          (total) => (this.total = total),
          (err) => console.log(err)
        );

        this.cargarDatos(this.paginacion);
      },
      (err) => console.log(err)
    );
  }
```

## Listar datos de con paginacion

Por cuestiones de rendimiento se debe limitar la
cantidad de datos a mostrar a si que la lista permite paginar por default

```typescript
  cargando = false;

  paginacion = { skip: 0, limit: 2 };

 cargarDatos(paginacion: Paginacion) {
    this.cargando = true;
    this.paginacion = paginacion;
    this.indexedDBService
      .find<Contacto>('contactos', this.paginacion)
      .subscribe(
        (datos) => {
          this.datosMostrar = datos;
          this.cargando = false;
          this.indexedDBService
            .contarDatos('contactos')
            .subscribe((total) => (this.total = total));
        },
        (err) => {
          console.log('error cargando todo', err);
          this.cargando = false;
        }
      );
  }


```

Ejemplo de paginación

```typescript
  anterior() {
    this.paginacion.skip -= this.paginacion.limit;
    this.cargarDatos(this.paginacion);
  }
  siguiente() {
    this.paginacion.skip += this.paginacion.limit;
    this.cargarDatos(this.paginacion);
  }


```

## Obtener un dato por su id.

```typescript
  actualizar(contacto) {
    this.indexedDBService
      .findById<Contacto>('contactos', contacto.id)
      .subscribe((contact) => {
        this.contacto = contact;
      });
  }
```

## Modificar un registro

```typescript
update(contacto: Contacto) {
    this.indexedDBService.update(contacto, 'contactos').subscribe(() => {
      this.contacto.id = undefined;
      this.contacto.nombre = '';
      this.contacto.telefono = '';
      this.cargarDatos(this.paginacion);
    });
  }


```

## Eliminar un dato

```typescript
eliminar(contacto) {
    this.indexedDBService.delete('contactos', contacto.id).subscribe(() => {
      this.cargarDatos(this.paginacion);
    });
  }
```

## Eliminar todo

```typescript
 eliminarTodo() {
    this.indexedDBService.deleteAll('contactos').subscribe(() => {
      this.cargarDatos(this.paginacion);
    });
  }

```

### Extra - Contar datos en tabla

```typescript
this.indexedDBService
  .contarDatosEnTabla("contactos")
  .subscribe(total => this.total = total)
```
