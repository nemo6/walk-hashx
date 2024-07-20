const fs     = require("graceful-fs")
const crypto = require("crypto")
const glob   = require("glob").glob

//

let list = [
"D:/HDD"
]

//

let cache = ( fs.existsSync("cache.txt") && fs.statSync("cache.txt").size != 0 )

//

;( async () => {

	/*time*/ let hrstart = process.hrtime()

	if( !cache ){

		m = await Promise.all( list.map( walk_folder ) )

		m = m.flat()
		m = m.filter( x => !/\/node_modules\/|\.dropbox\.cache/.test(x.pathx) )
		// m = m.filter( x => x.size != 0 )
		// m = m.filter( x => x.size <= 1_000_000 )
		// m = m.filter( x => x.size > 1_000_000 )

		console.log( "test1", m.length )

		//

		if( true /*&& false*/ ){

			const file_stream = fs.createWriteStream( "cache.txt" , { flags: "a" } )

			let max = m.length

			m = [...await Promise.allSettled( m.map( (x,i) => imohash2(x.pathx,x.size,i,file_stream,max) ) ) ]

			m = m.filter( x => x.status == "fulfilled" )
			.map( x => x.value)

			file_stream.end();console.log( "cache saved!" )

		}

		console.log( "test2", m.length )

	}else{

		let file = fs.readFileSync("cache.txt","utf8")
		if( file[0] != "[" ) file = `[${file.slice(0,-1)}]`
		m = JSON.parse( file )

	}

	//

	m.sort( (a,b) => b.size - a.size )

	//

	;( (w) => {
	
		for( let i=0;i<w.length;i++ ){
			if( m[i].hasOwnProperty("hashx") ){ m[i].hashx = short(25)(m[i].hashx) }
				m[i].pathx = short(63)(m[i].pathx)
				m[i].size = formatBytes(w[i].size)
		}

	})(m)

	//

	let content = transform(m)

	/*time*/ let hrend = process.hrtime(hrstart)

	/*time*/ console.info("Execution time : %d ms", Math.round( hrend[1] / 1000000 ) )

	server( content, "html" )

})()

async function imohash2(x,n,index,file_stream,max){

	// let [algo,format] = ["md5","base64"]
	let [algo,format] = ["sha1","hex"]

	return new Promise( (resolve,reject) => {

		fs.open( x, "r", async (err,fd) => {

			let buffer_array = ( () => {
    
    			if( n <= 9 ){
    
    				 let file = new Promise( (resolve,reject) => {
    					let buffer = new Buffer.alloc(n)
    					fs.read( fd, buffer, 0, n, 0, (err,num) => {
    						console.log( percentage(index,max), (index+1) +"/"+ max ,short(25)(x) )
    						resolve(buffer)
    					}
    				)})
    
    				return Promise.all([file])
    
    			}else{
    
    				let position = ( n % 2 == 0 ) ? Math.trunc(n/2)-1 : Math.trunc(n/2)
    
    				let beg = /*await */new Promise( (resolve,reject) => {
    					let buffer = new Buffer.alloc(3)
    					fs.read( fd, buffer, 0, 3, 0, (err,num) => {
    						console.log( percentage(index,max), (index+1) +"/"+ max ,short(25)(x) )
    						resolve(buffer)
    					}
    				)})
    				let mid = /*await */new Promise( (resolve,reject) => {
    					let buffer = new Buffer.alloc(3)
    					fs.read( fd, buffer, 0, 3, position-1, (err,num) => {
    						console.log( percentage(index,max), (index+1) +"/"+ max ,short(25)(x) )
    						resolve(buffer)
    					}
    				)})
    				let end = /*await */new Promise( (resolve,reject) => {
    					let buffer = new Buffer.alloc(3)
    					fs.read( fd, buffer, 0, 3, n-3, (err,num) => {
    						console.log( percentage(index,max), (index+1) +"/"+ max ,short(25)(x) )
    						resolve(buffer)
    					}
    				)})
    
    				return Promise.all([beg,mid,end])
    
    			}

			})()

			fs.close(fd)

			let data = Buffer.concat( await buffer_array )

			let hashx = crypto.createHash(algo).update(data).digest(format)

			let result = { hashx: hashx, pathx:x, size:n }

			file_stream.write( "\n\n" + JSON.stringify(result) + "," )

			resolve(result)

		})
	})

}

async function walk_folder(dir){

	let array = []

	for( let x of (await glob( dir + "/**", { absolute:true } )).reverse() ){

		let stats = await fs.promises.stat(x)

		if( stats.isFile() ){

			array.push( { pathx: x.replace( /\\/g , "/" ) , size:stats.size } )

		}

	}

	return array

}

function short(n){ 
	return x => x.length > n ? x.slice(0,n) + "..." : x
}

function transform(m){
    
    let content = "<style>table{font-family:arial,sans-serif;border-collapse:collapse;}td,th{border:1px solid #dddddd;text-align:left;padding:8px;}</style>"
    content += "<table>"
    content += `<tr>${ [ "", ...Object.keys(m[0]) ].map( x => `<th>${x}</th>` ).join("") }</tr>`
    for( let [i,x] of m.entries() ){
    	( (m) => {
    	content += `<tr>`
    	content += `<td>${i+1}</td>`
    	for ( let [i,x] of m.entries() )
    		content += `<td>${x}</td>`
    	})( Object.values(x) )
    	content += `</tr>`
    }
    content += "</table>"
    return content

}

function formatBytes(bytes,decimals=3){

	if ( bytes === 0 ) return "0 octets"
	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ["octets", "ko", "mo", "go", "to", "po", "eo", "zo", "yo"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	float = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))
	return Math.trunc(float) + " " + sizes[i]

}

function percentage( partialValue, totalValue ){
	return Math.ceil( ( 100 * partialValue ) / totalValue )
}

function server(x,n){

	const http = require("http")
	const PORT = 8080

	http.createServer( (req,res) => {

		res.writeHead(200,{"content-type":`text/${n};charset=utf8`})

		res.end(x)

	}).listen(PORT)

	console.log(`Running at port ${PORT}`)

}
