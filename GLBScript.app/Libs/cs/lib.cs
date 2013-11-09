using System;
using System.Collections.Generic;

namespace GLB
{
    public class GLBException : Exception
    {
        private string text;
        public GLBException( string text )
        {
            this.text = text;
        }

        override public string toString( )
        {
            return text;
        }
    }

    public class GLBAssertException : Exception
    {
        private string text;
        public GLBAssertException( string text )
        {
            this.text = text;
        }

        override public string toString( )
        {
            return "AssertException; " + text;
        }
    }

    public static partial class GLBNative
    {
        public static Random rnd;

        public static int CastToInt( int d )
        {
            return d;
        }

        public static int CastToInt( string d )
        {
            int res;
            if ( int.TryParse( d, out res ) )
            {
                return res;
            }
            else
            {
                return 0;
            }
        }

        public static int CastToInt( float d )
        {
            return ( int )d;
        }

        public static int INTEGER( float d )
        {
            return CastToInt( d );
        }

        public static float CastToFloat( float d )
        {
            return d;
        }

        public static float CastToFloat( string d )
        {
            float res;
            if ( float.TryParse( d, out res ) )
            {
                return res;
            }
            else
            {
                return 0.0f;
            }
        }

        public static float CastToFloat( int d )
        {
            return ( float )d;
        }

        public static int GETTIMERALL( )
        {
            var d = new DateTime( );
            return d.Millisecond;
        }

        public static int INSTR( string text, string such, int start )
        {
            return text.IndexOf( such, start );
        }

        public static int REVINSTR( string text, string such, int start )
        {
            return text.LastIndexOf( such, start );
        }


        public static string MID_Str( string text, int start, int len )
        {
            return text.Substring( start, len );
        }

        public static string LEFT_Str( string text, int len )
        {
            return MID_Str( text, 0, len );
        }

        public static string RIGHT_Str( string text, int len )
        {
            return MID_Str( text, text.Length - len, len );
        }

        public static string REPLACE_Str( string text, string from, string to )
        {
            return text.Replace( text, to );
        }

        public static string TRIM_Str( string text, string split )
        {
            return text.Trim( split.ToCharArray( ) );
        }

        public static int ASC( string text, int pos )
        {
            return ( int )text[ pos ];
        }

        public static string CHR_Str( int asc )
        {
            return ""+Convert.ToChar( asc );
        }

        public static string LCASE_Str( string str )
        {
            return str.ToLower( );
        }

        public static string UCASE_Str( string str )
        {
            return str.ToUpper( );
        }

        public static string GETCOMMANDLINE_Str( )
        {
            return ""; //TODO!
        }

        public static float RND( float rng )
        {
            if ( rnd == null ) rnd = new Random( );
            return (float)(rnd.NextDouble() * rng);
        }

        public static float RND( int rng )
        {
            return RND( ( float )rng );
        }

        public static void STDOUT( string text )
        {
            Console.Write( text );
        }

        public static void KEYWAIT( )
        {
            Console.ReadKey( );
        }

        public static void END( )
        {
            Environment.Exit( 0 );
        }

        public static int GENFILE( )
        {
            //TODO
            return 0;
        }

        public static int OPENFILE( int channel, string path, int mode )
        {
            //TODO
            return 1;
        }

        public static int ENDOFFILE( int channel )
        {
            //TODO
            return 1;
        }

        public static void READLINE( int channel, ref string line )
        {
            //TODO
        }

        public static void READUBYTE( int channel, ref int val )
        {
            //TODO
        }

        public static void WRITESTR( int channel, string str )
        {
            //TODO
        }

        public static void CLOSEFILE( int channel )
        {
            //TODO
        }

        public static string GETCURRENTDIR_Str( )
        {
            //TODO
            return "";
        }

        public static void SETCURRENTDIR( string dir )
        {
            //TODO
        }

        public static int DOESFILEEXIST( string file )
        {
            //TODO
            return 0;
        }

        public static int DOESDIREXIST( string dir )
        {
            //TODO
            return 0;
        }

        public static void KILLFILE( string file )
        {
            //TODO
        }

        public static int GETFILELIST( string find, GLBArray<string> names )
        {
            //TODO
            return 0;
        }

        public static int CREATEDIR( string path )
        {
            //TODO
            return 0;
        }

        public static void COPYFILE( string from, string to )
        {
            //TODO
        }

        public static int SHELLCMD( string cmd, float wait, float show, ref float rv )
        {
            //TODO
            return 0;
        }

        public static bool forCheck( int cur, int to, int step )
        {
            if ( step > 0 )
            {
                return cur <= to;
            }
            else if ( step < 0 )
            {
                return cur >= to;
            }
            else
            {
                return true;
            }
        }
        public static bool forCheck( float cur, float to, float step )
        {
            if ( step > 0 )
            {
                return cur <= to;
            }
            else if ( step < 0 )
            {
                return cur >= to;
            }
            else
            {
                return true;
            }
        }

        public static void STDERR( string text )
        {
            Console.Error.Write( text );
        }

        public static string PLATFORMINFO_Str( string text )
        {
            //TODO
            return "";
        }

        public static int MOD(int a, int b) {
            return a % b;
        }

        public static int bOR( int a, int b )
        {
            return a | b;
        }

        public static int bAND( int a, int b )
        {
            return a & b;
        }

        public static int Copy( this int val )
        {
            return val;
        }

        public static float Copy( this float val )
        {
            return val;
        }

        public static string Copy( this string val )
        {
            return val;
        }
    }

    public class GLBArray<T>
    {
        public List<T> data;
        public int[] dims;

        public int Length
        {
            get
            {
                return this.dims[ 0 ];
            }
        }

        private int realSize( )
        {
            int size = 1;
            for ( int i = 0; i < dims.Length; i++ )
            {
                size *= dims[ i ];
            }
            return size;
        }

        private int realPos( int pos, int dim )
        {
            if ( pos < 0 ) pos = dim + pos;
            if ( pos >= dims[ dim ] ) throw new IndexOutOfRangeException( "Array out of bounds! dim: '" + dim + "' pos: '" + pos + "'" );
            return pos;
        }

        public GLBArray( )
        {
            data = new List<T>( );
            dims = new int[] { 0 };
        }

        public void dim( int[] dims )
        {
            //Array aufstellen
            this.dims = dims;
            this.data = new List<T>( realSize( ) );
        }

        public void redim( int[] dims )
        {
            if ( this.dims.Length == dims.Length )
            {
                this.dims = dims;
                this.data.Capacity = realSize( );
            }
            else
            {
                this.dim( dims );
            }
        }

        public int bounds( int dimension )
        {
            return this.dims[ dimension ];
        }

        public void dimpush( T obj )
        {
            this.data.Add( obj );
            this.dims[ 0 ]++;
        }

        public void dimdel( int p )
        {
            this.data.RemoveAt( p );
            this.dims[ 0 ]--;
        }

        public void dimdata( T[] obj )
        {
            this.dims = new int[] { obj.Length };
            this.data = new List<T>( obj );
        }

        public T this[ int pos1 ]
        {
            get
            {
                return this.data[ realPos( pos1, 0 ) ];
            }
            set
            {
                this.data[ realPos( pos1, 0 ) ] = value;
            }
        }

        public T this[ int pos1, int pos2 ]
        {
            get
            {
                pos1 = realPos( pos1, 0 );
                pos2 = realPos( pos2, 1 );

                return this.data[ pos1 + pos2 * dims[ 0 ] ];
            }
            set
            {
                this.data[ pos1 + pos2 * dims[ 0 ] ] = value;
            }
        }

        public T this[ int pos1, int pos2, int pos3 ]
        {
            get
            {
                pos1 = realPos( pos1, 0 );
                pos2 = realPos( pos2, 1 );
                pos3 = realPos( pos3, 2 );

                return this.data[ pos1 + pos2 * dims[ 0 ] + pos3 * dims[ 1 ] * dims[ 0 ] ];
            }
            set
            {
                pos1 = realPos( pos1, 0 );
                pos2 = realPos( pos2, 1 );
                pos3 = realPos( pos3, 2 );

                this.data[ pos1 + pos2 * dims[ 0 ] + pos3 * dims[ 1 ] * dims[ 0 ] ] = value;

            }
        }

        public T this[ int pos1, int pos2, int pos3, int pos4 ]
        {
            get
            {
                pos1 = realPos( pos1, 0 );
                pos2 = realPos( pos2, 1 );
                pos3 = realPos( pos3, 2 );
                pos4 = realPos( pos4, 3 );

                return this.data[ pos1 + pos2 * dims[ 0 ] + pos3 * dims[ 1 ] * dims[ 0 ] + pos4 * dims[ 2 ] * dims[ 1 ] * dims[ 0 ] ];
            }
            set
            {
                pos1 = realPos( pos1, 0 );
                pos2 = realPos( pos2, 1 );
                pos3 = realPos( pos3, 2 );
                pos4 = realPos( pos4, 3 );

                this.data[ pos1 + pos2 * dims[ 0 ] + pos3 * dims[ 1 ] * dims[ 0 ] + pos4 * dims[ 2 ] * dims[ 1 ] * dims[ 0 ] ] = value;
            }
        }

        public GLBArray<T> Copy( )
        {
            GLBArray<T> other = new GLBArray<T>( );
            int[] newDims = new int[this.dims.Length];
            for ( int i = 0; i < newDims.Length; i++ )
            {
                newDims[ i ] = dims[ i ];
            }
            other.dim( newDims );
            for ( int i = 0; i < this.data.Count; i++ )
            {
                other.data[ i ] = this.data[ i ];
            }

            return other;
        }
        /*public List<T> multiAccess(params int[] pos) {
            int cache = 0;
            var mul = this.data.Capacity / this.dims[ pos.Length - 1 ];
            for ( var i = pos.Length - 1; i >= 0; i-- )
            {
                pos[ i ] = realPos( pos[ i ], i );

                cache += pos[ i ] * mul;
                mul /= this.dims[ i - 1 ];
            }
            PositionCache = cache;
            return this.data;
        }*/
    }
}
