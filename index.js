const express = require('express')

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const Db = require('./db'); // Importar tu base de datos personalizada
const morgan = require('morgan');
const { log } = require('console');

const app = express()
const port = process.env.PORT||8000
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'dx2bv5ew12w9s8f6mz3x2fs'; 

// Ruta para registrar un usuario
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await Db.get_json(email);
    if (existingUser) {
        return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear nuevo usuario
    const user = { name, email, password: hashedPassword };
    await Db.set_json(email, user);

    // Generar un token
    const token = jwt.sign({ id: email }, JWT_SECRET, { expiresIn: '100h' });

    // Devolver el token en la respuesta
    res.status(201).json({ message: 'Usuario registrado exitosamente', token });
});

// Ruta para autenticar (login) un usuario
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Verificar si el usuario existe
    const user = await Db.get_json(email);
    if (!user) {
        return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    // Generar un token
    const token = jwt.sign({ id: email }, JWT_SECRET, { expiresIn: '100h' });

    res.status(200).json({ message: 'Autenticación exitosa', token });
});

// Middleware para proteger rutas
















const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        console.log(">>",token,"<<");
        res.status(400).json({ error: 'Token no válido' });
    }
};
app.get('/items',authenticate, async (req, res) => {
    const allData = await Db.get_json("items");

    res.status(200).json(allData);
});



app.post('/object', async (req, res) => {
    const {id,codigo,clase_objeto,observacion,ubucacion_actual} = req.body;
    
    log(id)

    if ((typeof codigo!= "number") || (typeof clase_objeto!= "number") || !observacion ||!ubucacion_actual) {
        return res.status(400).json({ msg: 'Todos los campos son obligatorios' });
    }

    const allData = await Db.get_json("items");
    

    for(var i=0;i<allData.objetos.length;i++){
        if(allData.objetos[i].codigo==codigo&&id!=allData.objetos[i].id){
            return res.status(409).json({ msg: codigo+" ya esta registrado" });
        }
    }
    if(id!=null){
        allData.objetos[id]={
            id,
            codigo,
            clase_objeto,
            observacion,
            ubucacion_actual
        }
    }else{
        allData.objetos.push({
            id:allData.objetos.length,
            codigo,
            clase_objeto,
            observacion,
            ubucacion_actual
        })
    }

    await Db.set_json("items",allData)


    res.status(200).json({msg:"objeto registrado"});
});




app.delete('/object', async (req, res) => {
    const allData = await Db.get_json("items");


    if(!allData.objetos[req.query.id]){
        res.status(404).json({error:"El objeto no existe"})
        return
    }

    allData.objetos[req.query.id]=false


    await Db.set_json("items",allData)

    res.json({msg:"Objeto eliminado"})
})

app.delete('/object_type', async (req, res) => {
    const allData = await Db.get_json("items");


    if(!allData.clases_objetos[req.query.id]){
        res.status(404).json({error:"El tipo de objeto no existe"})
        return
    }

    allData.clases_objetos[req.query.id]=false


    await Db.set_json("items",allData)

    res.json({msg:"Tipo de objeto eliminado"})
})

app.post('/object_type', async (req, res) => {
    const {id,nombre, descripcion, valor} = req.body;
    if (!nombre || !descripcion || !valor) {
        return res.status(400).json({ msg: 'Todos los campos son obligatorios' });
    }

    const allData = await Db.get_json("items");
    

    for(var i=0;i<allData.clases_objetos.length;i++){
        if(i!=id&&allData.clases_objetos[i].nombre==nombre){
            return res.status(409).json({ msg: nombre+" ya esta registrado" });
        }
    }
    if(id==null){
        allData.clases_objetos.push({
            id:allData.clases_objetos.length,
            nombre,
            descripcion,
            valor
        })
    }else{
        allData.clases_objetos[id]={
            id,
            nombre,
            descripcion,
            valor
        }
    }
    await Db.set_json("items",allData)


    res.status(200).json({msg:"tipo de objeto registrado"});
});



app.get('/editar_tipo_de_objeto.html', async function(req, res) {
    const Data = (await Db.get_json("items")).clases_objetos[req.query.id];
    fs.readFile('./public/_editar_tipo_de_objeto.html', 'utf8', (err, data) => {
        if (err) {
            res.status(200).send('Error al leer el archivo:'+(JSON.stringify(err)));
            return;
        }
        data=data.replace("{nombre}",Data.nombre)
        data=data.replace("{descripcion}",Data.descripcion)
        data=data.replace("{valor}",Data.valor)
        data=data.replace("{id}",Data.id)
        res.send(data);
    });
});
app.get('/registrar_tipo_de_objeto.html', async function(req, res) {

    fs.readFile('./public/_editar_tipo_de_objeto.html', 'utf8', (err, data) => {
        if (err) {
            res.status(200).send('Error al leer el archivo:'+(JSON.stringify(err)));
            return;
        }
        data=data.replace("{nombre}","")
        data=data.replace("{descripcion}","")
        data=data.replace("{valor}","")
        data=data.replace("{id}","null")
        res.send(data);
    });
});
app.get('/editar_objeto.html', async function(req, res) {   
    

    const Data = (await Db.get_json("items")).objetos[req.query.eid];

    fs.readFile('./public/_crear_objeto.html', 'utf8', (err, data) => {
        if (err) {
            res.status(200).send('Error al leer el archivo:'+(JSON.stringify(err)));
            return;
        }
        data=data.replace("{id}",req.query.eid)
        data=data.replace("{codigo}",Data.codigo)
        data=data.replace("{observacion}",Data.observacion)
        data=data.replace("{ubucacion_actual}",Data.ubucacion_actual)
        data=data.replace("{clase_objeto}",req.query.id)
        res.send(data);
    });
});




app.get('/crear_objeto.html', async function(req, res) {

    fs.readFile('./public/_crear_objeto.html', 'utf8', (err, data) => {
        if (err) {
            res.status(200).send('Error al leer el archivo:'+(JSON.stringify(err)));
            return;
        }
        data=data.replace("{id}","null")
        data=data.replace("{codigo}","")
        data=data.replace("{observacion}","")
        data=data.replace("{ubucacion_actual}","")
        data=data.replace("{clase_objeto}",req.query.id)
        res.send(data);
    });
});




app.use(express.static('public'));
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '/public/login.html'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})




