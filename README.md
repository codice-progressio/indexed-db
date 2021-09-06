# Indexed-DB

Helper limpio y sencillo para Angular.

### Instalación

> `npm i @codice-progressio/indexed-db`

### Uso

Agrega el modal en el modulo más alto que lo necesites.

```javascript
import { IndexedDBModule } from "@codice-progressio/indexed-db";

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
> } from "@codice-progressio/indexed-db";
> ```

Inyecta `IndexedDBService` en el componente o servicio donde vayas a trabajar e inicializa la BD.

> Este procedimiento se puede repetir las veces que sean necesarias para crear multiples bases de datos.

```typescript

  constructor(private indexedDBService: IndexedDBService) {
    this.inicializarIndexedDB();
  }

  baseDeDatos: IDBDatabase;
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
      this.baseDeDatos = bd;
      console.log('Indexed-DB inicializado');
    });
  }

```

## Grabar datos

```typescript
 agregarDato(nombre: string, telefono: string) {
    let contacto: Contacto = {
      id: Math.trunc(Math.random() * 10000000),
      nombre,
      telefono,
    };

    this.indexedDBService
      .save<Contacto>(contacto, 'contactos', this.baseDeDatos)
      .subscribe(
        (servicio) => {
          console.log('Se agrego un dato');
          this.telefono = '';
          this.nombre = '';
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
      .find<Contacto>('contactos', this.baseDeDatos, this.paginacion)
      .subscribe(
        (datos) => {
          this.datos = datos;
          this.datosMostrar = this.datos;
          this.cargando = false;
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
      .findById<Contacto>('contactos', this.baseDeDatos, contacto.id)
      .subscribe((contact) => {
        this.contacto = contact;
      });
  }
```

## Modificar un registro

```typescript
  update(contacto: Contacto) {
    this.indexedDBService
      .update<Contacto>(contacto, 'contactos', this.baseDeDatos)
      .subscribe(() => {
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
    this.indexedDBService
      .delete('contactos', this.baseDeDatos, contacto.id)
      .subscribe(() => {
        this.cargarDatos(this.paginacion);
      });
  }
```
## Eliminar todo 
```typescript
 eliminar(contacto) {
    this.indexedDBService
      .delete('contactos', this.baseDeDatos, contacto.id)
      .subscribe(() => {
        this.cargarDatos(this.paginacion);
      });
  }
  
```


### Extra - Contar datos en tabla

``` typescript
 this.indexedDBService
              .contarDatosEnTabla('contactos', this.baseDeDatos)
              .then((total) => (this.total = total));
``` 